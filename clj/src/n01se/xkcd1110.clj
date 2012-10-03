(ns n01se.xkcd1110
  (:require [clj-json.core :as json]
            [n01se.ws :as ws] ))

(set! *warn-on-reflection* true)

(def max-clients 20)
(def max-msg-length 500)
(def push-interval 75)

(defn send-one [ws obj]
  (ws/send-message ws (json/generate-string obj)))

(defn round [num places]
  (let [factor (Math/pow 10 places)]
    (/ (Math/round (* num factor)) factor)))

(def start (System/currentTimeMillis))

(defn circle [uri i]
  (let [radius 150
        speed 0.2
        delay 150
        halfpi (/ Math/PI 2)
        ws (ws/ws-client uri :onmessage (fn [_ _]))]
    (send-one ws {:nick (str "circlebot " i)})
    (loop [theta (* 0.3 i)]
      (send-one ws
              {:dx (round (* (Math/cos (+ theta halfpi)) speed) 4)
               :dy (round (* (Math/sin (+ theta halfpi)) speed) 4)
               :x (Math/round (+  -823 (* (Math/cos theta) radius)))
               :y (Math/round (+ -1523 (* (Math/sin theta) radius)))
               :sent (- (System/currentTimeMillis) start)})
      (Thread/sleep delay)
      (recur (+ theta (/ (* speed delay) 150))))))

;; server state:
(defonce last-id (atom 0))
(defonce client-struct (ref {})) ;; ref of map of client obj to thing
;; could be another ref in the struct:
(defonce changes (ref {})) ;; ref of map of client obj to client-delta
(defonce publisher (agent 0))

(defn get-world []
  (dosync
    (into {} (for [{:keys [id data-ref]} (vals @client-struct)]
               [id @data-ref]))))

(defn send-all [obj]
  (let [txt (json/generate-string obj)]
    (doseq [struct (vals @client-struct)]
      (try
        (ws/send-message ^WebSocket$Connection (:conn struct) txt)
        (catch java.io.IOException e
          ;; presumably this connection will be closed shortly...
          nil)))))


(defn get-id [client]
  (get-in @client-struct [client :id]))

(defn publish [i]
  (when (seq @changes)
    (let [old-changes
            (dosync
              (let [old-changes @changes]
                (alter changes empty)
                old-changes))]
      (send-all {:change
                  (zipmap (map get-id (keys old-changes))
                          (vals old-changes))})))
  ;; do it again:
  (Thread/sleep push-interval)
  (send-off *agent* publish)
  (inc i))

(defn remove-client [client]
  (let [id (get-id client)]
    (dosync
      (commute client-struct dissoc client)
      (commute changes dissoc client))
    (println "Client count:" (count @client-struct))
    (send-all {:delete id})))

(defn server-onopen [client conn]
  (let [id (swap! last-id inc)
        struct {:id id, :conn conn, :data-ref (ref {})} ]
    (println "New client ID" id conn)
    (dosync
      (commute client-struct assoc client struct))
    (send-one conn
      {:id id, :all (get-world)})))

(defn server-onclose [client code msg]
  (println "Client ID" (get-id client) "disconnected")
  (remove-client client))

(defn server-onmessage [client data]
  (if (> (count data) max-msg-length)
    (do
      (println "Client ID" (get-id client) "sent oversize message"
              (count data) "chars")
      (ws/close (get-in @client-struct [client :conn])))
    (let [id (get-id client)
          msg (json/parse-string data true)]
      (when-not (:whomp msg)
        (dosync
          (commute changes update-in [client] merge msg)
          (let [data-ref (get-in @client-struct [client :data-ref])]
            (alter data-ref merge msg)))))))

(defn carefully [f]
  (fn [& args]
    (try
      (apply f args)
      (catch Exception e
        (.printStackTrace e)
        (throw e)))))

(defn -main [& [mode arg1 arg2]]
  (case mode
    "server"
    (let [port (if arg1 (Integer/parseInt arg1) 8090)
          server (ws/ws-server :port port
                  :onopen (carefully #'server-onopen)
                  :onclose (carefully #'server-onclose)
                  :onmessage #'server-onmessage)]
      (prn "server" :port port)
      (.start server)
      (send-off publisher publish)
      server)

    "client"
    (let [client-count (if arg1 (Integer/parseInt arg1) 1)
          uri (if arg2 arg2 "ws://localhost:8090") ]
      (prn "client" :client-count client-count :uri uri)
      (dotimes [i client-count]
        (future
          (circle uri i))))

    (throw (Exception. (str "Unknown mode: " mode)))))

