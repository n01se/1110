(ns n01se.test1110
  (:require [clj-json.core :as json])
  (:import (org.eclipse.jetty.websocket
            WebSocket$OnTextMessage WebSocketClientFactory WebSocket$Connection)
           (java.util.concurrent TimeUnit)
           (java.net URI)))

(set! *warn-on-reflection* true)

(defn ws-client
  [uri & {:keys [onopen onclose onmessage buffer-size]}]
  (let [onopen (or onopen (fn [conn] (println "onopen:" conn)))
        onclose (or onclose (fn [code msg] (println "onclose:" code msg)))
        onmessage (or onmessage (fn [data] (println "onmessage" data)))
        buffer-size (or buffer-size 4096)]
    (-> (WebSocketClientFactory.)
        (doto (.setBufferSize buffer-size) .start)
        .newWebSocketClient
        (doto (.setMaxTextMessageSize buffer-size))
        (.open (URI. uri)
               (reify WebSocket$OnTextMessage
                 (onOpen [this connection] (onopen connection))
                 (onClose [this code msg] (onclose code msg))
                 (onMessage [this data] (onmessage data))))
        (.get 10 TimeUnit/SECONDS))))

(defn sendjs [ws obj]
  (.sendMessage ^WebSocket$Connection ws (json/generate-string obj)))

(defn round [num places]
  (let [factor (Math/pow 10 places)]
    (/ (Math/round (* num factor)) factor)))

(defn circle [uri i]
  (let [radius 150
        speed 0.1
        halfpi (/ Math/PI 2)
        ws (ws-client uri :onmessage (fn [_]))]
    (sendjs ws {:nick (str "circlebot " i)})
    (loop [theta (* 0.3 i)]
      (sendjs ws
              {:dx (round (* (Math/cos (+ theta halfpi)) speed) 4)
               :dy (round (* (Math/sin (+ theta halfpi)) speed) 4)
               :x (Math/round (+  -823 (* (Math/cos theta) radius)))
               :y (Math/round (+ -1523 (* (Math/sin theta) radius)))})
      (Thread/sleep 150)
      (recur (+ 0.1 theta)))))

(defn -main [& [client-count]]
  (let [client-count (if client-count (Integer/parseInt client-count) 1)]
    (prn :client-count client-count)
    (dotimes [i client-count]
      (future
        (circle "ws://localhost:8080" i)))))
