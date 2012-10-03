(ns n01se.xkcd1110
  (:require [clj-json.core :as json]
            [n01se.ws :as ws]))

(set! *warn-on-reflection* true)

(defn round [num places]
  (let [factor (Math/pow 10 places)]
    (/ (Math/round (* num factor)) factor)))

(def start (System/currentTimeMillis))

(defn circle [uri i]
  (let [radius 150
        speed 0.2
        delay 150
        halfpi (/ Math/PI 2)
        ws (ws/ws-client uri :onmessage (fn [_]))]
    (ws/sendjson ws {:nick (str "circlebot " i)})
    (loop [theta (* 0.3 i)]
      (ws/sendjson ws
              {:dx (round (* (Math/cos (+ theta halfpi)) speed) 4)
               :dy (round (* (Math/sin (+ theta halfpi)) speed) 4)
               :x (Math/round (+  -823 (* (Math/cos theta) radius)))
               :y (Math/round (+ -1523 (* (Math/sin theta) radius)))
               :sent (- (System/currentTimeMillis) start)})
      (Thread/sleep delay)
      (recur (+ theta (/ (* speed delay) 150))))))

(defn -main [& [mode arg1 arg2]]
  (condp = mode
    "server"
    (let [port (if arg1 (Integer/parseInt arg1) 8090)
          server (ws/ws-server :port port
                  :onopen (fn [this conn] (println this conn)))]
      (prn "server" :port port)
      (.start server)
      server)

    "client"
    (let [client-count (if arg1 (Integer/parseInt arg1) 1)
          uri (if arg2 arg2 "ws://localhost:8090") ]
      (prn "client" :client-count client-count :uri uri)
      (dotimes [i client-count]
        (future
          (circle uri i))))

    (throw (Exception. (str "Unknown mode: " mode)))))

