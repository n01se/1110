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

(def start (System/currentTimeMillis))

(defn circle [uri i]
  (let [radius 150
        speed 0.2
        delay 150
        halfpi (/ Math/PI 2)
        ws (ws-client uri :onmessage (fn [_]))]
    (sendjs ws {:nick (str "circlebot " i)})
    (loop [theta (* 0.3 i)]
      (sendjs ws
              {:dx (round (* (Math/cos (+ theta halfpi)) speed) 4)
               :dy (round (* (Math/sin (+ theta halfpi)) speed) 4)
               :x (Math/round (+  -823 (* (Math/cos theta) radius)))
               :y (Math/round (+ -1523 (* (Math/sin theta) radius)))
               :sent (- (System/currentTimeMillis) start)})
      (Thread/sleep delay)
      (recur (+ theta (/ (* speed delay) 150))))))

(defn -main [& [client-count uri]]
  (let [client-count (if client-count (Integer/parseInt client-count) 1)
        uri (if uri uri "ws://localhost:8080")]
    (prn :client-count client-count)
    (dotimes [i client-count]
      (future
        (circle uri i)))))

