const http = require('http');
const { Command } = require('commander');
const fs = require('fs');
const path = require('path');

const program = new Command();

program
  .requiredOption('-h, --host <host>', 'Server host address')
  .requiredOption('-p, --port <port>', 'Server port')
  .requiredOption('-c, --cache <cachePath>', 'Cache directory path');

const args = process.argv.slice(2);

if (!args.includes('-h') && !args.includes('--host') ||
    !args.includes('-p') && !args.includes('--port') ||
    !args.includes('-c') && !args.includes('--cache')) {
  console.log('Параметр не задано!');
  process.exit(1);
}

program.parse(process.argv);

const { host, port, cache } = program.opts();

if (isNaN(port) || port <= 0 || port > 65535) {
  console.log('Помилка: Порт має бути числом в діапазоні від 1 до 65535!');
  process.exit(1);
}

if (!fs.existsSync(cache)) {
  console.log('Помилка: Кеш-каталог не існує!');
  process.exit(1);
}


const get = (req, res) => {
  const urlParts = req.url.split('/');
  const httpCode = urlParts[urlParts.length - 1];
  
  const filePath = path.join(cache, `${httpCode}.jpg`);  

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Image is not found\n');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  });
};


const put = (req, res) => {
  const urlParts = req.url.split('/');
  const httpCode = urlParts[urlParts.length - 1];
  
  const filePath = path.join(cache, `${httpCode}.jpg`);

  const writeStream = fs.createWriteStream(filePath);
  
  req.pipe(writeStream);

  req.on('end', () => {
    res.writeHead(201, { 'Content-Type': 'text/plain' });
    res.end(`Image saved as ${httpCode}.jpg\n`);
  });

  req.on('error', (err) => {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error saving the image\n');
  });
};

const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    get(req, res);
  } else if (req.method === 'PUT') {
    put(req, res);
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method is not allowed\n');
  }
});

server.listen(port, host, () => {
  console.log(`Сервер запущено http://${host}:${port}`);
});

