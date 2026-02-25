origin=http://localhost:8000
# head=http://localhost:9988
head=http://localhost:8010/proxy

curl -I -X OPTIONS \
  -H "Origin: ${origin}" \
  -H 'Access-Control-Request-Method: GET' \
  --head "${head}/webdav/server"
