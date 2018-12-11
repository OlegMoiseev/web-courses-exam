// function readURL(input) {
//     if (input.files && input.files[0]) {
//         var reader = new FileReader();
//         reader.onload = function (e) {
//             $('#image_for_proc')
//                 .attr('src', e.target.result)
//                 .width(800);
//             // .height(200);
//         };
//         reader.readAsDataURL(input.files[0]);
//     }
// }

function getFilters() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '127.0.0.1/getFilters', true);
    xhr.onload = function () {
        document.getElementById("filters").innerHTML = xhr.responseText;
    };
    xhr.onerror = function () {
        console.log("Some error occurred - msg from onerror func");
    };
    xhr.send();
}