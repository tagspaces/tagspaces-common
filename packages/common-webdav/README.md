## Web Browser usage and CORS

When in the browser take care with policies such as CORS - If the server is not configured correctly WebDAV requests will fail. Make sure that you return the correct headers and CORS preflight OPTIONS requests are not under Auth:

https://www.jujens.eu/posts/en/2015/Jun/27/webdav-options/

https://serverfault.com/questions/866606/webdav-and-cors

`curl -XOPTIONS -H "Access-Control-Request-Method: GET" -H "Origin: http://localhost:8000" --head http://localhost:9988/webdav/server`

`Header always set Access-Control-Allow-Origin "*" Header always set Access-Control-Allow-Headers "origin, content-type, cache-control, accept, authorization, if-match, destination, overwrite" Header always set Access-Control-Expose-Headers "ETag" Header always set Access-Control-Allow-Methods "GET, HEAD, POST, PUT, OPTIONS, MOVE, DELETE, COPY, LOCK, UNLOCK" Header always set Access-Control-Allow-Credentials "true"`

#### Instead of WebDav CORS config you can use the CORS proxy:

`node local-cors-proxy/lcp.js --proxyUrl http://localhost:9988`
