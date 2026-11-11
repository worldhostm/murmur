import { createSignalingHttpServer } from './http';
const port = Number(process.env.PORT ?? 8788);
// Local development only: anonymous connections are not production authentication.
createSignalingHttpServer().listen(port, process.env.HOST ?? '127.0.0.1', () => {
  console.log(`Signaling listening on ${port}`);
});
