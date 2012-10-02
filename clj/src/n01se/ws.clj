(ns n01se.ws
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

(defn sendjson [ws obj]
  (.sendMessage ^WebSocket$Connection ws (json/generate-string obj)))
