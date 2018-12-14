function getName() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/getName', true);
    xhr.onload = function () {
        document.getElementById("accName").innerHTML = xhr.responseText;
    };
    xhr.onerror = function () {
        console.log("Some error occurred - msg from onerror func");
    };
    xhr.send();
}

function readURL(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function (e) {
            $('#image_for_proc')
                .attr('src', e.target.result)
                .width('50%');
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function getFilters() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/getFilters', true);
    xhr.onload = function () {
        let js = JSON.parse(xhr.responseText);
        for (let i = 0; i < js.length; ++i) {
            document.getElementById("filters").innerHTML +=
                '<div><input type="checkbox" name="' + js[i].id + '">\n' +
                '<label for="' + js[i].id + '">' + js[i].id + ' ' + js[i].name + '</label>\n' +
                '<input type="text" id="' + js[i].name + 'Params" class="form-control" placeholder="Enter parameters"></div>';
        }

    };
    xhr.onerror = function () {
        console.log("Some error occurred - msg from onerror func");
    };
    xhr.send();
}

function sendJson() {
    let input_obj = document.getElementsByTagName('input');
    var js = "[";
    for (let i = 0; i < input_obj.length; i++) {
        if (input_obj[i].type === 'checkbox' && input_obj[i].checked === true) {
            js += '{ "id":"' + input_obj[i].name + '", "parameters":"{' + input_obj[i + 1].value + '}"},';
        }
    }
    if (js.length > 1) js = js.substring(0, js.length - 1);
    js += ']';

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/addImage", true);
    xhr.setRequestHeader("Content-type", "application/json");

    xhr.send(js);

    console.log(js);
}
