// HTTPS (CONNECT) proxy on the Mac for OrbStack containers.
// On some networks OrbStack corrupts larger TLS uploads from containers ("tls: bad record MAC"), while the Mac's own
// connections are fine. NudgeBee's agent sends its events through this proxy, so they leave from the Mac.
// Usage: node scripts/egress-proxy.mjs   (listens on :3128; pods use http://host.orb.internal:3128)
import http from "node:http";
import net from "node:net";

const PORT = Number(process.env.PROXY_PORT || 3128);

const server = http.createServer((req, res) => {
  res.writeHead(405).end("CONNECT only\n");
});

server.on("connect", (req, client, head) => {
  const [host, port = "443"] = req.url.split(":");
  const upstream = net.connect(Number(port), host, () => {
    client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head.length) upstream.write(head);
    upstream.pipe(client);
    client.pipe(upstream);
  });
  const close = () => {
    upstream.destroy();
    client.destroy();
  };
  upstream.on("error", close);
  client.on("error", close);
});

server.listen(PORT, () => console.log(`egress proxy on :${PORT}`));
