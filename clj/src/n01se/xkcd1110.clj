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

(defn -main [& [client-count uri]]
  (let [client-count (if client-count (Integer/parseInt client-count) 1)
        uri (if uri uri "ws://localhost:8080")]
    (prn :client-count client-count)
    (dotimes [i client-count]
      (future
        (circle uri i)))))

