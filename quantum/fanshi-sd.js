
let section = document.getElementById("section");
console.log(section);
let urls = document.URL.split("//");
let url = urls[0] + "//" + urls[1].split("/")[0];
//首次加载默认加载前言
let xmlhttp = new XMLHttpRequest();
let rdUrl = url + "/sleeping-dream/reading-guide.html";
xmlhttp.open("GET", rdUrl, true);
xmlhttp.send();
xmlhttp.onreadystatechange = function () {
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        // @ts-ignore
        section.innerHTML = xmlhttp.responseText;
    }
}

//绑定章节跳转
let chapters = document.getElementById("chapter").getElementsByTagName("a");
for (let c of chapters) {
    c.onclick = function () {
        let targetPath = c.getAttribute("data-url");
        let chapterUrl = url + targetPath;
        xmlhttp.open("GET", chapterUrl, true);
        xmlhttp.send();
    }
}

