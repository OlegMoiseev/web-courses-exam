function readURL(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function (e) {
            $('#image_for_proc')
                .attr('src', e.target.result)
                .width(800);
            // .height(200);
        };
        reader.readAsDataURL(input.files[0]);
    }
}