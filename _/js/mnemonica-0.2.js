// Мы получаем все теги на странице, которые должны иметь интерактивность
// Для каждого мы создаем объект, через который будут устанавливаться данные
// Затем определяется функция обновления данных с сервера и запускается периодический опрос

function Mnemo(settings) {

	// Определение начальных параметров
	settings = settings || {};
	settings.insqlSource = settings.insqlSource || '';
	settings.insqlTimeout = settings.insqlTimeout || 10000;
	settings.blinkTimeout = settings.blinkTimeout || 1000;
	settings.blinkCount = settings.blinkCount || 10;
    settings.defaultFixed = settings.defaultFixed || 3;
    settings.allowEdit = settings.allowEdit || false;

	// Определение версии браузера (для анимаций)
	var hasCanvas = !(function(){
		var undef, v = 3, div = document.createElement('div'), all = div.getElementsByTagName('i');
		while (div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i>< ![endif]-->', all[0]);
		return v > 4 ? v : undef;
	}());


	/** Перечень всех тегов, значения которых запрашиваются с сервера InSQL */
	var insqlTags = { "Time": 0 };

	// Определение всех интерактивных значений
	var objects = document.querySelectorAll('[tag]');
	var OBJECTS = [];

	// Расстановка всех элементов, имеющих координаты в атрибутах X и Y
	var elements = document.querySelectorAll('[X]');
	for (var i = 0; i < elements.length; i++) {
		elements[i].style.display = 'none';
		elements[i].style.position = 'absolute';
		elements[i].style.left = (elements[i].getAttribute('X') || '0') + 'px';
		elements[i].style.top = (elements[i].getAttribute('Y') || '0') + 'px';
		elements[i].style.display = 'block';
	};

	// Создание объектов
	for (var i = 0; i < objects.length; i++) {
		OBJECTS.push(new Tag(objects[i]));
	};

	// Построение строки запроса
	var queryArray = [];
	for (var key in insqlTags) queryArray.push(key);
	var queryString = settings.insqlSource + '?tag=' + encodeURIComponent(queryArray.join(','));

	// Запуск таймера на получение значений с сервера
	UpdateInSQLTags();
	setInterval(UpdateInSQLTags, settings.insqlTimeout);

	// Создание таймера, выполняющего мигание элементов
	ChangeBlink();
	setInterval(ChangeBlink, settings.blinkTimeout);


	/**
	 * Создание глобальных переменных по именам тегов (для дальнейшего получения их значений после загрузки с сервера)
	 * @param {HTMLElement} el 
	 */
	function createInsqlTags(el) {
		var tags = (el.getAttribute('tag') || '').split(',');
		for (var i = 0; i < tags.length; i++) {
			insqlTags[tags[i]] = 0;
			window[tags[i]] = 0;
		}
		return tags;
	}

	/**
	 * Объект, состояние которого зависит от значений InSQL
	 * @param {HTMLElement} el 
	 */
	function Tag(el) {

		// Определение InSQL тегов, необходимых для задания состояния объекта
		// Все теги, имеющие отношение к объекту, должны быть перечислены в атрибуте "tag" в HTML через запятую
		var tags = createInsqlTags(el);

		// Определение функции для получения результирующего значения
		var evl = el.getAttribute('evl');
		if (!evl) evl = 'vl=' + tags[0];

		// Установка значений по умолчанию
		var defaultClass = el.className;
		if (el.hasAttribute('text')) el.innerHTML = el.getAttribute('text');

		// Определение уставок по значениям
		// Уставки задаются в параметре check и представляют собой массив из 4 элементов
		// Внешний вид в диапазонах задается в параметре check_class как массив из 5 элементов
		var checkRange = -1,
			newCheckRange = -1;

		var hasChecks = el.hasAttribute('check') && el.hasAttribute('check_class');
		var hasBlinks = (el.getAttribute('check_class') || '').indexOf('Blink_') > -1;
		
		// Определение дополнительного типа объекта
		var type = el.getAttribute('type') || '';
		if (type.indexOf(':') > -1) type = type.split(':')[0];

		// Определение дополнительных обработчиков по типу объекта
		var setValue,
			setChecks = function () {},
			setBlink = function () {},
			setLevel = function () {},
			setSpinner = function () {};

		setValue = function (value) {
			if (!el.hasAttribute('text')) {
				el.innerHTML = isNaN(Number(value)) 
					? value 
					: parseFloat(Number(value).toFixed(settings.defaultFixed)); 
			}
		}

		// Функция обновления состояния объекта
		this.update = function () {

			// Получение значения, определяющего состояние объекта
			var vl = 0, ttl = undefined;
			eval(evl);
			if (ttl) el.title = ttl;

			setValue(vl);
			setChecks(vl);
			setBlink(vl);
			setSpinner(vl);
			setLevel(vl);
		}

		if (hasChecks) {

			var checks = (el.getAttribute('check') || '').split(',');
			var checksClasses = (el.getAttribute('check_class') || '').split(',');
			if (checks.length == 0) return alert('В объекте "' + tags[0] + '" не определены уставки');
			if (checks.length >= checksClasses.length) return alert('В объекте "' + tags[0] + '" не хватает классов по уставкам. Ожидается N+1 классов');

			// Обработка массива уставок
			for (var i = 0; i < checks.length; i++) {

				// В случае, когда уставка не указана, она принимается по умолчанию
				if (checks[i] == '' || checks[i] == '\'\'') {
					if (i == 0) checks[i] = -1 * Infinity;
					else if (i == checks.length - 1) checks[i] = Infinity;
					else checks[i] = 0;
				}
				// Иначе же тег, который ее представляет, добавляется к списку InSQL тегов
				else if (isNaN(checks[i])) {
					insqlTags[checks[i]] = 0;
				}
			}

			// Установка начального диапазона уставки как диапазона в середине
			checkRange = -1;

			setChecks = function (value) {

				checkRange = newCheckRange;

				// Получаем численные значения уставок
				value = Number(value);
				var checksValues = checks;
				for (var i = 0; i < checksValues.length; i++) if (isNaN(checksValues[i])) checksValues[i] = eval(checksValues[i]);

				// Проверка вхождения в диапазоны уставок. Мы знаем и уверены в длине массива уставок - она равна 4;
				newCheckRange = checksClasses.length - 1;
				var newCheckClass = checksClasses[newCheckRange];
				
				for (var i = 0; i < checksValues.length; i++) {
					if (value <= checksValues[i]) {
						newCheckClass = checksClasses[i];
						newCheckRange = i;
						break;
					}
				}

				// Поддержка визуализации при выходе за уставки (если класс CSS содержит в названии "Blink_")
				if (checkRange != newCheckRange) {
					el.className = defaultClass + ' ' + newCheckClass;
				}
			}
		}

		if (hasBlinks) {

			el.setAttribute('blinkcount', settings.blinkCount);

			setBlink = function () {
				// Мигание добавляется, если класс содержит ключевое слово, а до этого уставка была в другом диапазоне
				if (el.className.indexOf('Blink_') > -1 && checkRange != newCheckRange) {
					el.className = defaultClass + ' ' + checksClasses[newCheckRange];
					el.setAttribute('blinkcount', 0);
				}
			}
		}

		if (type == 'array') {
			// Получаем наименование JS масиива, из которого будут браться данные
			var arrayName = (el.getAttribute('type') || '').replace('array:', '');

			setValue = function () {
				var vl = '';
				eval('try{vl=' + arrayName + '[' + tags[0] + ']}catch(e){vl="Err"}');
				el.innerHTML = vl;
			}
		}

		if (type == 'image') {
			// Переопределяем функцию получения значения
			evl = el.getAttribute('evl');
			if (!evl) evl = 'vl="' + tags[0] + '"';

			setValue = function () {
				var vl = '';
				eval(evl);
				if (el.src != vl) el.src = vl;
			}
		}

		if (type == 'spinner') {
			// Получение настроек
			var params = (el.getAttribute('type') || '').replace('spinner:', '').split(',');

			if (params.length != 5) return alert('В элементе спиннера ' + tags[0] + ' не определено нужное кол-во параметров!');

			var X = Number(params[0]),
				Y = Number(params[1]),
				radius = Number(params[2]), 
				defaultStep = Number(params[3]),
				source = params[4];

			//Размещаем анимированный рисунок с параметрами (отступ слева, отступ сверху,высота, ширина)
			var spinner = document.createElement('img');
			spinner.src = source;
			spinner.style.position = 'absolute';
			spinner.style.width = radius + 'px';
			spinner.style.height = radius + 'px';
			spinner.style.left = X + 'px';
			spinner.style.top = Y + 'px';
			document.body.appendChild(spinner);

			var spinnerInterval = 0,
				step = 0,
				currentRotate = 0;

			setValue = function () {};

			setSpinner = function (value) {
				if (value != step) {
					clearInterval(spinnerInterval);
					spinnerInterval = setInterval(rotate, 24);
					if (value != 0) {
						step = defaultStep / value * 360;
					} else {
						step = 0;
					}
				}
			}

			function rotate() {
				currentRotate = currentRotate + step;
				if (currentRotate > 360) currentRotate -= 360;
	
				if (hasCanvas) {
					spinner.style.transform = 'rotate(' + currentRotate + 'deg)';
				}
				else {
					var rad = currentRotate * Math.PI / 180,
						M11 = Math.cos(rad),
						M12 = -Math.sin(rad),
						M21 = -M12,
						M22 = M11;
	
					spinner.style.filter = 'progid:DXImageTransform.Microsoft.Matrix(M11=' + M11 + ', M12=' + M12 + ', M21=' + M21 + ', M22=' + M22 + ', SizingMethod="auto expand", enabled=true)';
	
					var rect = spinner.getBoundingClientRect();
					var w = rect.right - rect.left;
					var h = rect.bottom - rect.top;
	
					spinner.style.marginLeft = -Math.round((w - spinner.width) / 2) + 'px';
					spinner.style.marginTop = -Math.round((h - spinner.height) / 2) + 'px';
				}
			}
		}
		
		if (type == 'levelH' || type == 'levelW') {
			// Получение настроек
			var types = (el.getAttribute('type') || '').split(':');
			if (types.length != 2) return alert('В элементе уровня ' + tags[0] + ' неправильно определен тип');

			var params = types[1].split(',');
			if (params.length != 3) return alert('В элементе уровня ' + tags[0] + ' не определено нужное кол-во параметров!');

			var type = types[0],
				top = Number(el.getAttribute('Y') || '0'),
				maximum = Number(params[2]);

			if (type == 'levelH') {
				el.style.width = params[0] + 'px';
				el.style.height = params[1] + 'px';
				el.style.top = top - Number(params[1]) + 'px';
			} else if (type == 'levelW') {
				el.style.width = params[1] + 'px';
				el.style.height = params[0] + 'px';
				el.style.top = top - Number(params[0]) + 'px';
			}

			setValue = function () {};

			setLevel = function (value) {
				// Определение размеров конечного элемента
				if (type == 'levelH') {
					var h = Math.floor((params[1] / maximum) * value);
					el.style.top = Number(top) - h + "px";
					el.style.height = h + 'px';
				}
				else if (type == 'levelW') {
					el.style.width = Math.floor((params[1] / maximum) * value) + 'px';
				}
			}
		}
	}

	/**
	 * Функция, получающая значения с сервера InSQL и запускающая обновление объектов
	 */
	function UpdateInSQLTags() {

		//Создание транспорта и получение значений
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = queryString + '&r=' + Math.random();
		script.onerror = script.onload = script.onreadystatechange = function () {
			if (!this.loaded && (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete')) {
				this.loaded = 1;
				this.onerror = this.onload = this.onreadystatechange = null;
				this.parentNode.removeChild(this);
				delete script;

				// Все теги проверяются на недостоверные данные
				for (var key in insqlTags) if (window[key] == null || window[key] == '') window[key] = 0;

				// Обновление элементов
				for (var i = 0; i < OBJECTS.length; i++) OBJECTS[i].update();
			}
		};
		if (document.getElementsByTagName('head').length) {
			document.getElementsByTagName('head')[0].appendChild(script);
		} else {
			document.appendChild(script);
		}
	};

	/**
	 * Мигание обьектов
	 * * div должен содержать className вида "Blink_%", где "Blink_" обязателен
	 * * должен быть описан класс "Blink_%_r"
	 * * должен быть описан класс "Blink_%_g"
	 */
	function ChangeBlink() {
		for (var i = 0; i < objects.length; i++) {
			if (objects[i].hasAttribute('blinkcount')) {
				var blinkCount = Number(objects[i].getAttribute('blinkcount') || '0');
				if (blinkCount < settings.blinkCount) {
					var blinkClass = objects[i].className;
					if (blinkClass.indexOf('_r') > -1) {
						objects[i].className = objects[i].className.replace('_r', '_g');
					}
					else {
						objects[i].className = blinkClass.replace('_g', '') + '_r';
					}
					objects[i].setAttribute('blinkcount', ++blinkCount);
				}
			}
		}
    };
}


// Проверка значения на Null, чтобы избежать ошибок при расчете сложных формул в evl

function notNull(value) {
	return (value == 'Null' || value == '') ? 0 : Number(value);
}