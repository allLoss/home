let content_grid = document.getElementsByClassName("content-grid")[0];
let content_divs = content_grid.getElementsByClassName("content-div");

for (var e of content_divs) {

    let targetPath = e.getAttribute("data-url");
    let url = window.location.host + targetPath;
   
    e.onclick = function(){
        console.log(document.domain);
        console.log(targetPath);
       // window.location.href ="file:///D:/ide/project/pwp/literatrue/main.html"
    
    }
    
}



