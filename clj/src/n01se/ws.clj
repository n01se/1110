(ns n01se.ws
  (:require [clj-json.core :as json])
  (:import [org.eclipse.jetty.websocket
            WebSocket$OnTextMessage WebSocketClientFactory WebSocket$Connection
            WebSocketServlet]
           [org.eclipse.jetty.server Server]
           [org.eclipse.jetty.server.nio SelectChannelConnector]
           [org.eclipse.jetty.servlet ServletContextHandler ServletHolder]
           [java.util.concurrent TimeUnit]
           [java.net URI]))

(set! *warn-on-reflection* true)

(defn ws-client
  [uri & {:keys [onopen onclose onmessage buffer-size]}]
  (let [onopen (or onopen (fn [this conn] (println "onopen:" conn)))
        onclose (or onclose (fn [this code msg] (println "onclose:" code msg)))
        onmessage (or onmessage (fn [this data] (println "onmessage" data)))
        buffer-size (or buffer-size 4096)]
    (-> (WebSocketClientFactory.)
        (doto (.setBufferSize buffer-size) .start)
        .newWebSocketClient
        (doto (.setMaxTextMessageSize buffer-size))
        (.open (URI. uri)
               (reify WebSocket$OnTextMessage
                 (onOpen [this connection] (onopen this connection))
                 (onClose [this code msg] (onclose this code msg))
                 (onMessage [this data] (onmessage this data))))
        (.get 10 TimeUnit/SECONDS))))

(defn sendjson [ws obj]
  (.sendMessage ^WebSocket$Connection ws (json/generate-string obj)))


(defn ws-server
  [& {:keys [port onopen onclose onmessage ws-path]
      :or {port 8080
           ws-path "/"}}]
  (let [onopen (or onopen (fn [this conn] (println "onopen:" conn)))
        onclose (or onclose (fn [this code msg] (println "onclose:" code msg)))
        onmessage (or onmessage (fn [this data] (println "onmessage:" data)))
        servlet (proxy [WebSocketServlet] []
                  (doGet [request response]
                    (.. (proxy-super getServletContext)
                        (getNamedDispatcher (proxy-super getServletName))
                        (forward request response)))
                  (doWebSocketConnect [request response]
                    (reify WebSocket$OnTextMessage
                      (onOpen [this connection] (onopen this connection))
                      (onClose [this code msg] (onclose this code msg))
                      (onMessage [this data] (onmessage this data)))))
        context (doto (ServletContextHandler.)
                  (.setContextPath "/")
                  (.addServlet (ServletHolder. servlet) ws-path))
        connector (doto (SelectChannelConnector.)
                    (.setPort port)
                    (.setMaxIdleTime Integer/MAX_VALUE))
        server (doto (Server.)
                 (.setHandler context)
                 (.addConnector connector))]
    server))


