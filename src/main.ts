import { createServer } from 'http';

/**********************************************************************************/

createServer((req, res) => {
  const reqUrl = req.url;

  if (reqUrl === '/health') {
    res.writeHead(204).end();
  }
}).listen(4334, '0.0.0.0', () => {
  console.log('Server is running');
});
