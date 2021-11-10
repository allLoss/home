
let content_grid = document.getElementsByClassName("content-grid")[0];
let content_divs = content_grid.getElementsByClassName("content-div");
let urls = document.URL.split("//");
let url = urls[0] + "//" + urls[1].split("/")[0];

//绑定跳转地址
for (let e of content_divs) {
    e.onclick = function () {
        let targetPath = e.getAttribute("data-url");
        window.location.href = url + targetPath;;

    }

}