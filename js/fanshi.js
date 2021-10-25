let content_grid = document.getElementsByClassName("content-grid")[0];
let content_divs = content_grid.getElementsByClassName("content-div");

for (var e of content_divs) {

    let targetPath = e.getAttribute("data-url");
    let url = "https://" + document.domain + targetPath;

    e.onclick = function () {
        console.log(url);
        console.log(targetPath);
        window.location.href = url;
    }

}





