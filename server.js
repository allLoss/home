var http = require("http");
var fs = require("fs");
const { json } = require("stream/consumers");

http.createServer(function (request, response) {
    // 获取要读取的文件路径
    var pathname = (request.url).slice(1);
    // 读取文件内容
    fs.readFile(pathname, function (err, data) {
        if (err) { // 读取失败了
            console.log(err);
        } else {
            // 将读取到的内容返回
            // response.setHeader("Content-type","text/html;charset=utf-8");
            response.write(data.toString());

        }
        response.end();
    })
}).listen(3000);


