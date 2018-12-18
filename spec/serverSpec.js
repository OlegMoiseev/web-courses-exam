describe("Запрос", function() {
    it("должен оканчиваться на {1, 2}", function() {
        let good = "INSERT INTO filters_applied (id_filter, id_processed_img, serial_number, parameters) VALUES" +
            "($1, $2, $3, '{1, 2}')";
        expect(createReq([1, 2])).toEqual(good);
    });
});

describe("Запрос", function() {
    it("должен оканчиваться на {}", function() {
        let good = "INSERT INTO filters_applied (id_filter, id_processed_img, serial_number, parameters) VALUES" +
            "($1, $2, $3, '{}')";
        expect(createReq([])).toEqual(good);
    });
});

describe("Фильтр", function() {
    it("Gaussian blur - 1й", function() {
        let good = 1;
        expect(getFilterId("Gaussian blur")).toEqual(good);
    });
});

describe("Фильтр", function() {
    it("Erode - 10й", function() {
        let good = 10;
        expect(getFilterId("Erode")).toEqual(good);
    });
});

describe("Фильтр", function() {
    it("Rotate - 7й", function() {
        let good = 7;
        expect(getFilterId("Rotate")).toEqual(good);
    });
});

describe("Фильтр", function() {
    it("Dilate - 11й", function() {
        let good = 11;
        expect(getFilterId("Dilate")).toEqual(good);
    });
});


describe("Параметры", function() {
    it("должны быть {1, 2}", function() {
        let good = "{1, 2}";
        expect(getParameters([1, 2])).toEqual(good);
    });
});


describe("Параметры", function() {
    it("должны быть {}", function() {
        let good = "{}";
        expect(getParameters([])).toEqual(good);
    });
});

describe("Вход", function() {
    it("должен остаться неизменным", function() {
        let good = 1;
        expect(getOdd(1)).toEqual(good);
    });
});


describe("Вход", function() {
    it("должен остаться неизменным", function() {
        let good = 11;
        expect(getOdd(11)).toEqual(good);
    });
});

describe("Вход", function() {
    it("должен увеличиться на 1", function() {
        let good = 11;
        expect(getOdd(10)).toEqual(good);
    });
});

describe("Вход", function() {
    it("должен увеличиться на 1", function() {
        let good = 113;
        expect(getOdd(112)).toEqual(good);
    });
});
