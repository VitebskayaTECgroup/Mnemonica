///<reference path="interfaces.ts" />

//#region Вспомогательные функции

/**
 * Асинхронный запрос
 * @param {string} url Адрес
 * @param {boolean} withCredentials Передавать ли данные для аутентификации
 * @param {Document | XMLHttpRequestBodyInit | null | undefined} form Посылаемые данные
 * @param {(this: XMLHttpRequest, responseText: string) => void} callback Обработчик ответа
 */
function req(url, withCredentials, form, callback) {
	var xhr = new XMLHttpRequest();
	xhr.open(form ? 'POST' : 'GET', url + (url.indexOf('?') > -1 ? '&' : '?') + 'r=' + Math.random(), true)
	if (!!form) { xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded') }
	xhr.withCredentials = withCredentials
	xhr.onreadystatechange = function () {
		if (xhr.readyState != 4) return
		if (xhr.status >= 400) {
			log('Нет связи с сервером', 'red')
		}
		else if (callback) {
			callback.call(xhr, xhr.responseText)
		}
	}
	xhr.send(form)
}

/**
 * Создание тега html с любым уровнем вложенности (реализация hyperscript)
 * @param {string} tagNameRaw Наименование html тега
 */
function h(tagNameRaw) {

	var className = [], id, tag = ''

	// разбор имени (в нем могут быть указаны классы, id и атрибуты)
	var chunks = tagNameRaw.split('.')
	for (var i = 0; i < chunks.length; i++) {
		var x = chunks[i]
		if (x.indexOf('#') > -1) {
			id = x.substring(x.indexOf('#') + 1)
			if (i == 0) tag = x.substring(0, x.indexOf('#'))
			else className.push(x.substring(0, x.indexOf('#')))
		} else {
			if (i == 0) tag = x
			else className.push(x)
		}
	}

	// создание html элемента и присвоение ему разобранных настроек
	var elem = document.createElement(tag)
	if (id) elem.id = id
	if (className.length > 0) elem.className = className.join(' ')

	function parseProp(prop) {
		if (prop === null || prop === undefined) {
			elem.innerHTML = 'NULL'
		}

		else if (isProps(prop)) {
			for (var key in prop) {
				var data = prop[key]
				if (key == 'style') {
					if (isProps(data)) {
						for (var styleProperty in data) {
							elem.style[styleProperty] = data[styleProperty]
						}
					} else elem.setAttribute('style', String(data))
				}
				else if (key == 'className') elem.className = data
				else if (key == 'innerHTML') elem.innerHTML = String(data)
				else if (key == 'value') /** @type {HTMLInputElement} */(elem).value = data
				else if (key == 'checked') /** @type {HTMLInputElement} */(elem).checked = !!data
				else if (typeof data == 'function') elem[key] = data
				else elem.setAttribute(key, String(data))
			}
		}

		else if (isArray(prop)) {
			for (var i = 0; i < prop.length; i++) {
				parseProp(prop[i])
			}
		}

		else if (isNode(prop)) {
			elem.appendChild(prop)
		}

		else if (isPrimitive(prop)) {
			elem.insertAdjacentHTML('beforeend', String(prop))
		}

		function isArray(obj) {
			return (Object.prototype.toString.call(obj) === '[object Array]')
		}

		function isNode(obj) {
			return (obj.tagName && typeof obj === 'object')
		}

		function isProps(obj) {
			return (!obj.length && obj.toString() === '[object Object]')
		}

		function isPrimitive(obj) {
			return (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean')
		}
	}

	for (var i = 1; i < arguments.length; i++) {
		parseProp(arguments[i])
	}

	return elem
}

/**
 * Перевод даты в строку для отправки на сервер
 * @param {Date} date 
 * @param {string} format 
 */
function dateToString(date, format) {

	return format
		.replace('yyyy', String(date.getFullYear()))
		.replace('MM', addZero(date.getMonth() + 1))
		.replace('dd', addZero(date.getDate()))
		.replace('HH', addZero(date.getHours()))
		.replace('mm', addZero(date.getMinutes()))
		.replace('ss', addZero(date.getSeconds()))

	function addZero(number){
		return number < 10 ? ('0' + number) : ('' + number)
	}
}

/**
 * Изменение масштаба по скроллу
 * @param {WheelEvent} e Событие
 * @param {Number} min Ограничение минимума
 * @param {Number} max Ограничение максимума
 */
function zoom(e, min, max) {
	e.preventDefault()

	//var pageX = window.scrollX, pageY = window.scrollX
	console.log(e.offsetX, e.offsetY, 'zoom!')
	var scrollX = window.pageXOffset, scrollY = window.pageYOffset
	var oldX = e.offsetX, oldY = e.offsetY
	var oldScale = scale

	scale += e.deltaY * -0.005
	scale = Math.min(Math.max(min, scale), max) // restrictions
	
	localStorage.setItem('scale', String(scale))
	var container = /**@type {HTMLDivElement}*/(document.querySelector('[zoom-source]'))
	if (!container) return
	container.style.transform = 'scale(' + scale + ')'

	var maximize = scale > oldScale
	var x = 0, y = 0
	
	if (maximize) {
		x = (oldX + scrollX) * (1 - (oldScale / scale))
		y = (oldY + scrollY) * (1 - (oldScale / scale))
	} else {
		x = (scrollX) * (1 - (oldScale / scale))
		y = (scrollY) * (1 - (oldScale / scale))
	}
	console.log(maximize ? 'in' : 'out', x, y)
	console.log(oldScale, '/', scale, '=', oldScale / scale)
	window.scrollBy(x, y)
}

/**
 * Округление
 * @param {number} number число
 * @param {number} digits количество знаков
 * @returns 
 */
function R(number, digits) {
	var n = '1'
	digits = digits || 0
	try { while (digits--) n += '0' } catch (e) {}
	return Math.round(number * Number(n)) / Number(n)
}

/**
 * Контекстное окно
 * @param {MouseEvent | null} e событие, по которому происходит отображение
 * @param {HTMLElement} [html] содержимое окна
 */
function Dialog(e, html) {
	$('.dialog').remove()

	if (!e) return
	e.stopPropagation ? e.stopPropagation() : (e.cancelBubble = true)

	var div = h('div', {
		className: 'dialog',
		style: {
			'z-index': 100,
			position: 'absolute',
			background: '#333',
			color: '#fff',
			cursor: 'pointer',
			'font-family': '\'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif;',
			'min-width': '12rem;'
		}
	})

	// добавление на страницу вложенного содержимого
	div.appendChild(html || h('div'))
	document.body.appendChild(div)

	// позиционирование
	div.style.top = e.pageY + 'px'
	div.style.left = e.pageX + 'px'

	// корректировка на случай, если меню вылезает за пределы видимого окна
	let coords = div.getBoundingClientRect()
	let wid = document.documentElement.clientWidth + document.documentElement.scrollLeft
	let hei = document.documentElement.clientHeight + document.documentElement.scrollTop
	if ((e.pageX + coords.width + 10) > wid) 
		div.style.left = (wid - coords.width - 10) + 'px'
	if ((e.pageY + coords.height + 10) > hei) 
		div.style.top = (hei - coords.height - 10) + 'px'

	document.onclick = function (e) {
		if ($.contains(div, e.target)) return
		Dialog(null)
		document.onclick = function () { }
	}
}

/**
 * Контекстное меню для объекта
 * @param {MouseEvent} e 
 * @param {{ [key: string]: Function }} actions 
 */
function ContextMenu(e, actions) {
	var div = document.createElement('div')
	for (var key in actions) {
		action(key, actions[key])
	}
	action('Закрыть', function () {})
	Dialog(e, div)

	/**
	 * Выполнение действия
	 * @param {string} text 
	 * @param {Function} func 
	 */
	function action(text, func) {
		var s = document.createElement('div')
		s.style.cssText = 'padding: .5em 1em'
		s.onmouseenter = function () {
			s.style.background = '#444'
		}
		s.onmouseleave = function () {
			s.style.background = '#333'
		}
		s.innerHTML = text
		s.onclick = function () {
			func.call(e.target)
			Dialog(null)
		}
		div.appendChild(s)
	}
}

/**
 * Вывод всплывающих сообщений
 * @param {string} text текст
 * @param {string} [type] тип, влияющий на цвет сообщения
 */
function log(text, type) {
	var container = document.getElementById('messages')
	if (!container) {
		var vV = window.visualViewport
		if (!vV) return
		container = h('div', {
			id: 'messages',
			style: {
				position: 'fixed',
				'z-index': 2,
				left: 0,
				bottom: 0,
				'vertical-align': 'bottom',
				width: '20em',
				transform: 'scale(' + (1 / vV.scale) + ')'
			}
		})
		document.body.appendChild(container)
	}

	var div = h('div', {
		innerHTML: text,
		style: {
			background: (type || '#42d95c'),
			padding: '10px',
			'font-family': 'system-ui',
			'font-size': 'small',
			margin: '10px'
		}
	})
	container.appendChild(div)

	setTimeout(function () {
		if (!container) return
		container.removeChild(div)
	}, 3000)
}

/**
 * Всплывающее сообщение об ошибке с данными в консоль
 * @param {string} text текст сообщения
 * @param {Error} [e] сообщение об ошибке
 * @returns 
 */
function error(text, e) {
	console.error(text, e)
	return log(text, 'red')
}

//#endregion


//#region Запуск работы

var scale = Number(localStorage.getItem('scale'))
if (scale == 0) scale = 1

var container = /** @type {HTMLDivElement} */(document.querySelector('[zoom-source]'))
if (container) {
	container.style.transform = 'scale(' + scale + ')'
	var min = Number(container.getAttribute('zoom-min') || '0.5')
	var max = Number(container.getAttribute('zoom-max') || '4')
	container.onwheel = function (e) {
		zoom(e, min, max)
	}
}

$('[x]').each(function () {
	this.style.position = 'absolute'
	this.style.left = this.getAttribute('x') + 'px'
	this.style.top = this.getAttribute('y') + 'px'
})

$('[scheme]').each(function () {
	Mnemo(this)
})

//#endregion

/** @type {JQuery<HTMLElement>} */
var $dialog

/** 
 * Инициализация мнемосхемы на основе html элемента
 * @param {HTMLElement} container элемент с настройками, в который помещаются теги
 * */
function Mnemo(container) {

	var MnemoTypes = {
		'insql': {
			live: '../_/asp/taglive.asp',
			history: '../_/asp/taghistory.asp',
			create: '../_/asp/create.asp',
			update: '../_/asp/update.asp',
			del: '../_/asp/delete.asp',
			save: '../_/asp/saver.asp',
			auth: '../_/asp/user.asp'
		},
		'mnemonica': {
			live: 'http:\\\\web.vst.vitebsk.energo.net\\mnemotest\\base\\live',
			history: 'http:\\\\web.vst.vitebsk.energo.net\\mnemotest\\base\\log',
			create: 'http:\\\\web.vst.vitebsk.energo.net\\mnemotest\\base\\create',
			update: 'http:\\\\web.vst.vitebsk.energo.net\\mnemotest\\base\\update',
			del: 'http:\\\\web.vst.vitebsk.energo.net\\mnemotest\\base\\delete',
			save: '../_/asp/saver.asp',
			auth: '../_/asp/user.asp'
		}
	}

	if (!container) return error('Не найден корневой элемент схемы')
	var settings = {

		// аутентификация пользователей
		admins: (container.getAttribute('admins') || '').split(','),
		users: (container.getAttribute('users') || '').split(','),
		editor: false,
		admin: false,

		// настройки отображения
		zoom: container.getAttribute('zoom') || null,
		fix: container.hasAttribute('fix') ? Number(container.getAttribute('fix')) : -1,
		timeout: container.hasAttribute('timeout') ? Number(container.getAttribute('timeout')) : 5000,
		blinkTimeout: container.hasAttribute('blink-timeout') ? Number(container.getAttribute('blink-timeout')) : -1,
		blinkCount: container.hasAttribute('blink-count') ? Number(container.getAttribute('blink-count')) : 10,
		highlightTimeout: container.hasAttribute('highlight-timeout') ? Number(container.getAttribute('highlight-timeout')) : -1,

		// scada-функции
		type: container.getAttribute('type') || 'insql',
		db: MnemoTypes[container.getAttribute('type') || 'insql'],
		globalLog: (container.getAttribute('log') || 'false').toLowerCase() == 'true'
	}

	var scheme = container.getAttribute('scheme')
	var readyToWork = [false, false]

	var ID = 0

	/** Массив активных элементов схемы */
	var Storage = (function () {

		var objects = []

		/** @param {HTMLElement} sourceElement */
		function add (sourceElement) {
			if (sourceElement.nodeType == 3)
				return
			else if (sourceElement.hasAttribute('image')) {
				objects.push(new ImageElement(/** @type {HTMLImageElement} */(sourceElement)))
			}
			else if (sourceElement.hasAttribute('tags'))
				objects.push(new Item(sourceElement))
			else if (sourceElement.hasAttribute('control'))
				objects.push(new Control(/** @type {HTMLImageElement} */(sourceElement)))
			else if (sourceElement.hasAttribute('movable'))
				objects.push(new Movable(/** @type {HTMLImageElement} */(sourceElement)))
			else {
				sourceElement.setAttribute('static', '')
				objects.push(new Static(sourceElement))
			}
		}

		function create(elem) {
			objects.push(elem)
			save(true)
		}

		function update() {
			objects.forEach(function (obj) {
				obj.update()
			})
			container.style.display = 'block'
		}

		/**
		 * Сохранение структуры тегов в файл
		 * @param {boolean} [withReload] Выполнять ли перезагрузку мнемосхемы после сохранения
		 */
		function save(withReload) {
			var storage = document.createElement('div')
			objects.forEach(function (obj) {
				storage.appendChild(obj.toHtml())
				storage.insertAdjacentHTML('beforeend', '\n')
			})

			$.post(settings.db.save + '?id=' + scheme, storage.innerHTML, function () {
				log('Мнемосхема сохранена')
				if (withReload) location.reload()
			})
		}

		function copy(id) {
			for (var i = 0; i < objects.length; i++) {
				if (objects[i].id == id) {
					var newObj = Object.assign({}, objects[i])
					newObj.x += 10
					newObj.y += 10
					newObj.id = Math.random()
					objects.push(newObj)
					break;
				}
			}
			save(true)
		}

		function remove(id) {
			for (var i = 0; i < objects.length; i++) {
				if (objects[i].id == id) {
					objects.splice(i, 1)
					break;
				}
			}
			save(true)
		}

		return {
			add: add,
			create: create,
			update: update,
			save: save,
			copy: copy,
			remove: remove
		}
	})()

	// Авторизация
	if ((settings.users.length + settings.admins.length) > 0) {
		$.post(settings.db.auth, {}, function (text) {
			if (settings.users.indexOf(text) > -1) settings.editor = true
			if (settings.admins.indexOf(text) > -1) settings.admin = true
			readyToWork[1] = true
		})
	}
	else readyToWork[1] = true

	// Локальная библиотека элементов
	var Library = {
		controls: {},
		movable: {},
		images: {}
	}
	var LibraryElements = {}
	if (container.hasAttribute('lib')) {
		req(container.getAttribute('lib') + '.json', false, null, function (text) {
			try {
				var json = JSON.parse(text)
				Library = json
				readyToWork[0] = true
			} catch (e) {
				error('Ошибка при загрузке библиотеки элементов: ', e)
			}
		})
	} else readyToWork[0] = true

	var Insql = (function () {

		var tagsList = {}
		var tags = ''
		var enabled = false

		function add (arr) {
			arr.forEach(function (tag) {
				if (!tag) return
				if (!isNaN(tag)) return
				tagsList[tag] = 0
				enabled = true
			})

			var list = []
			for (var key in tagsList) list.push(key)
			tags = list.join(',')
		}

		function load () {
			$.post(settings.db.live, { tag: tags }, function (data) {
				try {
					eval(data)

					// Все теги проверяются на недостоверные данные
					for (var key in tagsList) {
						if (key && key != '') {
							if (window[key] == null || window[key] == '') window[key] = 0
						}
					}

					// Обновление элементов
					Storage.update()

				} catch (e) {
					error('Ошибка при получении данных из базы', e)
				}
			})
		}

		function all () {
			var arr = []
			for (var key in tagsList) arr.push(key)
			return arr
		}

		function start () {
			if (!enabled) return
			load()
			setInterval(load, settings.timeout)
		}

		return {
			add: add,
			start: start,
			load: load,
			all: all 
		}
	})()

	EditorContext()

	if (container.innerHTML == '') {
		req(scheme + '.html?r=' + Math.random(), false, null, function (html) {
			container.innerHTML = html
			//old = html
			Start()

			/* setInterval(function () {
				req(scheme + '.html?r=' + Math.random(), false, null, function (html) {
					if (html != old) location.reload()
				})
			}, 1000) */
		})
	} else {
		Start()
	}

	function Start() {
		for (var i = 0; i < readyToWork.length; i++) {
			if (!readyToWork[i]) return setTimeout(Start, 10)
		}
		
		$(container.querySelectorAll('[x],[tags],[static],[control],[movable]')).each(function () {
			Storage.add(/** @type {HTMLElement} */(this))
		})
		Insql.start()

		if (settings.blinkTimeout > 0) {
			setInterval(Blink, settings.blinkTimeout)
			Blink()
		}

		if (settings.highlightTimeout > 0) {
			setInterval(Highlight, 1000)
		}

		if (settings.globalLog) {
			document.body.appendChild(h('button', {
				innerHTML: 'Логи',
				onclick: Log,
				className: 'log-button',
				style: {
					position: 'fixed',
					bottom: '1em',
					left: '1em',
					'z-index': 2
				}
			}))
		}
	}

	function EditorContext() {
		// ожидание авторизации
		if (!readyToWork[1]) return setTimeout(EditorContext, 10)

		// ожидание загрузки локальной библиотеки
		if (!readyToWork[0]) return setTimeout(EditorContext, 10)

		// если чел не редактор и не админ, то действий не требуется
		if (!settings.admin && !settings.editor) return

		// строим контекстное меню размещения на основе библиотеки
		document.oncontextmenu = function (ev) {

			ev.preventDefault()

			/** @type {{[key: string]: Function}} */
			var actions = {}

			if (Library.movable) {
				Object.keys(Library.movable).forEach(function (mov) {
					try {
						actions[Library.movable[mov].text] = function () {
							Storage.create(new Movable(undefined, ev.pageX, ev.pageY, mov))
						}
					}
					catch (e) {
						return error('Неполное определение типа Movable: ' + mov, e)
					}
				})
			}

			if (settings.admin) {
				if (Library.images) {
					Object.keys(Library.images).forEach(function (imageType) {
						try {
							var defState = Object.keys(Library.images[imageType])[0]
							actions['Image: ' + imageType] = function () {
								req(settings.db.create, false, 'scheme=' + scheme + '&tag=&desc=&value=' + defState, function (text) {
									try {
										var json = JSON.parse(text)
										if (json.Done) log(json.Done)
										if (json.Tag) {
											Storage.create(new ImageElement(undefined, ev.pageX, ev.pageY, imageType, json.Tag, defState))
										}
										if (json.Error) {
											error('Ошибка в запросе на добавление тега', json.Error)
										}
									}
									catch (e) {
										return error('Неполное определение типа ImageElement: ' + imageType, e)
									}
								})
							}
						}
						catch (e) {
							return error('Неполное определение типа ImageElement: ' + imageType, e)
						}
					})
				}
				if (Library.controls) {
					Object.keys(Library.controls).forEach(function (ctrl) {
						try {
							var defState = Object.keys(Library.controls[ctrl])[0]
							actions['Control: ' + ctrl] = function () {
								Storage.create(new Control(undefined, ev.pageX, ev.pageY, ctrl, defState))
							}
						}
						catch (e) {
							return error('Неполное определение типа Control: ' + ctrl, e)
						}
					})
				}
			}

			ContextMenu(ev, actions)
		}
	}

	function Blink() {
		var divs = container.querySelectorAll('[blinkcount]')
		for (var i = 0; i < divs.length; i++) {
			var count = Number(divs[i].getAttribute('blinkcount'))
			if (count < settings.blinkCount) {
				var cls = divs[i].className.split(' ')
				for (var j = 0; j < cls.length; j++) {
					if (cls[j].toLowerCase().indexOf('blink_') > -1) {
						if (cls[j].indexOf('_inverted') > -1) {
							divs[i].className = divs[i].className.replace('_inverted', '')
						} else {
							divs[i].className = divs[i].className.replace(cls[j], cls[j] + '_inverted')
						}
						break;
					}
				}
				count++
				divs[i].setAttribute('blinkcount', '' + count)
			} else {
				divs[i].className = divs[i].className.replace('_inverted', '')
				divs[i].removeAttribute('blinkcount')
			}
		}
	}

	function Highlight() {
		var elements = container.querySelectorAll('[highlight]')
		for (var i = 0; i < elements.length; i++) {
			var count = Number(elements[i].getAttribute('highlight'))
			if (count <= 0) {
				elements[i].removeAttribute('highlight')
			}
			else {
				elements[i].setAttribute('highlight', String(--count))
			}
		}
	}

	function Log() {
		$.post(settings.db.history, { tag: Insql.all(), take: 20, skip: 0 }, function (json) {
			try { $dialog.dialog('close') } catch (e) {}
			var el = h('div', 
				h('table', 
					h('thead',
						h('tr', 
							h('th', 'Время', { style: { width: '12em' } }),
							h('th', 'Объект', { style: { width: '20em' } }),
							h('th', 'Состояние', { style: { width: '8em' } })
						)
					),
					h('tbody',
						$.map(json.Data, function (x) {
							var obj = LibraryElements[x.TagName]
							if (!obj) return null
							return h('tr', 
								h('td', x.Date),
								h('td', x.Name),
								h('td', obj.states[x.Value].text)
							)
						})
					)
				)
			)
			for (var key in LibraryElements) console.log(key, LibraryElements[key])
			$dialog = $(el)
				.dialog({ autoOpen: false, title: 'Логи (последние 20)', width: '40em' })
				//.dialog('option', 'position', { my: 'left bottom', at: 'left bottom', of: window })
				.dialog('open')
		})
	}


	// Интерактивные элементы мнемосхем

	/** @param {HTMLElement} el */
	function Item(el) {

		// определение основных настроек объекта
		this.id = Math.random()
		this.el = el
		this.title = el.hasAttribute('title') ? el.getAttribute('title') : null
		this.tags = (el.getAttribute('tags') || '').split(',')
		this.evl = el.getAttribute('evl') || ('vl=' + this.tags[0])
		this.className = el.hasAttribute('class') ? el.className : null
		this.checksString = el.hasAttribute('checks') ? el.getAttribute('checks') : null
		/** @type {string[]} */
		this.checks = el.hasAttribute('checks') ? (el.getAttribute('checks') || '').split(',') : []
		/** @type {string[]} */
		this.classes = el.hasAttribute('classes') ? (el.getAttribute('classes') || '').split(',') : []
		this.text = el.innerHTML != '' ? el.innerHTML : null
		this.fix = el.hasAttribute('fix') ? Number(el.getAttribute('fix')) : -1
		this.x = Number(el.getAttribute('x'))
		this.y = Number(el.getAttribute('y'))
		this.check = -1
		/** @type {number | undefined} */
		this.vl = undefined
		this.first = true
		this.modeSettings = { scale: 0 }

		// служебная переменная, позволяющая доступ к объекту в функциях
		var self = this

		// настройка отображения объекта
		if (el.hasAttribute('x')) {
			el.style.position = 'absolute'
			el.style.top = this.y + 'px'
			el.style.left = this.x + 'px'

			// разрешение перемещения элемента
			if (settings.admin) {
				$(self.el).draggable({
					stop: function () {
						self.x = Number(self.el.style.left.replace('px', ''))
						self.y = Number(self.el.style.top.replace('px', ''))
						Storage.save()
					}
				})
			}
		}
		if (this.text) this.el.innerHTML = this.text
		if (this.checksString && this.checks.length >= this.classes.length) this.classes.push('')

		// определение используемых тегов
		Insql.add(this.tags)
		Insql.add(this.checks)

		// установка блинкования
		if (this.classes.join('').toLowerCase().indexOf('blink_') > -1) this.el.setAttribute('blinkcount', '0')

		// определение типа
		this.mode = (el.getAttribute('type') || 'value').toLowerCase()
		switch (this.mode) {

			case 'image':
				this.modeUpdate = function (vl, ttl, src) {
					if (!src) {
						self.el.style.display = 'none'
					}
					else {
						// @ts-ignore
						(/** @type {HTMLImageElement} */self.el).src = src
						self.el.style.display = 'block'
					}
				}
				break

			case 'levelh':
			case 'levelw':
				this.modeSettings = {
					height: Number(el.getAttribute('level-height') || 0),
					width: Number(el.getAttribute('level-width') || 0),
					scale: Number(el.getAttribute('level-scale') || 1)
				}

				if (el.hasAttribute('level-image')) {
					el.style.backgroundImage = 'url(' + el.getAttribute('level-image') + ')'
				}

				if (this.mode == 'levelh') {
					this.el.style.top = (this.y - this.modeSettings.height) + 'px'
					this.el.style.width = this.modeSettings.width + 'px'
					this.el.style.height = this.modeSettings.height + 'px'
					this.modeSettings.scale = this.modeSettings.height / this.modeSettings.scale
				}

				if (this.mode == 'levelw') {
					this.el.style.top = (this.y - this.modeSettings.height) + 'px'
					this.el.style.width = '0px'
					this.el.style.height = this.modeSettings.height + 'px'
					this.modeSettings.scale = this.modeSettings.width / this.modeSettings.scale
				}

				this.modeUpdate = function (vl) {

					if (self.mode == 'levelh') {
						var h = Math.floor(self.modeSettings.scale * vl);
						el.style.top = Number(self.y) - h + "px";
						el.style.height = h + 'px';
					}
					
					if (self.mode == 'levelw') {
						el.style.width = Math.floor(self.modeSettings.scale * vl) + 'px';
					}
				}
				break

			case 'scalex':
				var subEl = document.createElement('div')
				el.appendChild(subEl)

				this.modeSettings = {
					min: Number(el.getAttribute('scale-min') || '0'),
					max: Number(el.getAttribute('scale-max') || '100'),
					height: el.getAttribute('scale-height') || '10px',
					sub: subEl,
					scale: 0
				}

				el.style.display = 'block'
				el.style.height = this.modeSettings.height
				subEl.style.display = 'inline-block'
				subEl.style.width = '50%'
				subEl.style.height = this.modeSettings.height

				this.modeUpdate = function (vl) {
					var currentScale = ((vl - self.modeSettings.min) / (self.modeSettings.max - self.modeSettings.min)) * 100
					self.modeSettings.sub.style.width = currentScale + '%'
					self.modeSettings.sub.title = R(vl, 2) + ' (' + R(currentScale, 2) + '%)'
					self.modeSettings.sub.innerHTML = String(R(vl, 2))
				}

				break

			default: {
				this.modeUpdate = function (vl) {

					// задан текст
					if (self.text) return

					// не числовое значение
					if (isNaN(Number(vl))) {
						self.el.innerHTML = vl
						return
					}

					// числовое значение округляется, если задан коеф. и нет округления в формуле
					if (self.evl.indexOf('toFixed(') > -1) {
						self.el.innerHTML = vl
					} else if (self.fix > -1) {
						self.el.innerHTML = Number(vl).toFixed(self.fix)
					} else if (settings.fix > -1) {
						self.el.innerHTML = Number(vl).toFixed(settings.fix)
					} else {
						self.el.innerHTML = vl
					}
				}
				break
			}
		}

		// обновление состояния объекта
		this.update = function () {
			var vl = 0, ttl, src
			try { eval(self.evl) } catch (e) {
				debugger
			}

			// проверка, есть ли текст по умолчанию. если нет, задать содержимое из eval
			if (ttl) self.el.title = ttl

			// Определение внешнего вида, в зависимости от типа
			self.modeUpdate(vl, ttl, src)

			// вычисление и отображение уставок
			vl = Number(vl)
			if (vl !== self.vl) {
				self.vl = vl
				if (self.first) self.first = false
				else {
					self.el.setAttribute('highlight', String(settings.highlightTimeout))
				}
			}

			var i = 0
			/** @type {number[]} */
			var checkvalues = []

			if (self.checksString) {

				for (i = 0; i < self.checks.length; i++) {
					if (isNaN(Number(self.checks[i]))) {
						try {
							checkvalues.push(eval(self.checks[i]))
						} catch (e) {
							checkvalues.push(0)
						}
					} else {
						checkvalues.push(Number(self.checks[i]))
					}
				}

				for (i = 0; i < checkvalues.length; i++) {
					if (vl <= checkvalues[i]) {
						setRange(i)
						break
					}
				}

				if (vl > checkvalues[checkvalues.length - 1]) {
					setRange(checkvalues.length)
				}
			}

			function setRange(index) {
				var hasBlinkBefore = self.el.className.toLowerCase().indexOf('blink_') > -1
				if (self.check == index) return
				self.check = index
				if (self.classes[index]) {
					self.el.className = (self.className ? self.className + ' ' : '') + self.classes[index]
				} else {
					self.el.className = self.className || ''
				}
				if (!hasBlinkBefore && self.el.className.toLowerCase().indexOf('blink_') > -1) self.el.setAttribute('blinkcount', '0')
			}
		}

		// сохранение настроек объекта
		this.toHtml = function () {
			var elem = /** @type {HTMLElement} */(self.el.cloneNode())
			elem.className = self.className || ''
			elem.innerHTML = self.text || ''
			elem.setAttribute('data-id', String(ID++))
			elem.setAttribute('x', String(self.x))
			elem.setAttribute('y', String(self.y))
			elem.removeAttribute('style')
			if (self.title) { elem.title = self.title }
			else if (elem.hasAttribute('title')) { elem.removeAttribute('title') }
			return elem
		}

		// информационное окно по тегу
		this.el.oncontextmenu = function (e) {
			e.preventDefault()
			e.stopPropagation()

			/** @type {{[key: string]: Function}} */
			var actions = {}
			
			self.tags.forEach(function (tag) {
				actions[tag] = function () {
					var a = document.createElement('a')
					a.style.display = 'none'
					a.target = '_blank'
					a.href = '/asu/pages/query/#t=' + tag + '|q=' + tag + '|mode=table'
					document.body.appendChild(a)
					a.click()
				}
			})

			ContextMenu(e, actions)

		}

		return this
	}

	/** @param {HTMLElement} el */
	function Static(el) {

		// определение основных настроек объекта
		this.id = Math.random()
		this.el = el
		this.x = Number(el.getAttribute('x'))
		this.y = Number(el.getAttribute('y'))
		this.drag = el.hasAttribute('drag') || false

		// служебная переменная, позволяющая доступ к объекту в функциях
		var self = this

		// настройка отображения объекта
		if (el.hasAttribute('x')) {
			el.style.position = 'absolute'
			el.style.top = this.y + 'px'
			el.style.left = this.x + 'px'

			// разрешение перемещения элемента
			if (settings.admin && this.drag) {
				$(self.el).draggable({
					stop: function () {
						self.x = Number(self.el.style.left.replace('px', ''))
						self.y = Number(self.el.style.top.replace('px', ''))
						Storage.save()
					}
				})
			}
		}

		// обновление состояния объекта
		this.update = function () {
			// в статическом объекте нечего обновлять, кроме координат
			// в будущем будет обновление абсолютных координат по их динамическим значениям (т.е. с учётом коэф. масштабирования)
		}

		// сохранение настроек объекта
		this.toHtml = function () {
			var elem = /** @type {HTMLElement} */(self.el.cloneNode(true))
			elem.setAttribute('data-id', String(ID++))
			elem.setAttribute('x', String(self.x))
			elem.setAttribute('y', String(self.y))
			elem.setAttribute('static', '')
			elem.removeAttribute('style')
			return elem
		}

		return this
	}

	/**
	 * Объект, меняющий отображение в зависимости от значения
	 * @param {HTMLImageElement} [el] html изображение
	 * @param {number} [x] координата X
	 * @param {number} [y] координата Y
	 * @param {string} [control] тип отображения
	 * @param {string} [state] выбранное состояние
	 */
	function Control(el, x, y, control, state) {

		// служебная переменная, позволяющая доступ к объекту в функциях
		var self = this

		// сохранение настроек объекта
		this.toHtml = function () {
			var elem = document.createElement('img')
			elem.setAttribute('data-id', String(ID++))
			elem.setAttribute('x', String(self.x))
			elem.setAttribute('y', String(self.y))
			elem.setAttribute('control', self.control)
			elem.setAttribute('state', self.state)
			return elem
		}

		// обновление состояния объекта
		this.update = function () {
			// в объекте управления меняется state, в связи с чем меняется вид элемента
			// состояния описываются в отдельной json библиотеке
			self.el.src = self.states[self.state].image
			self.el.title = self.states[self.state].text
		}

		if (!el) {
			this.x = x
			this.y = y
			this.control = control || ''
			this.state = state || ''
			this.el = document.createElement('img')
		}
		else {
			// определение основных настроек объекта
			this.id = Math.random()
			this.el = el
			this.x = Number(el.getAttribute('x'))
			this.y = Number(el.getAttribute('y'))
			this.dataId = Number(el.getAttribute('data-id'))
			this.control = el.getAttribute('control') || ''
			this.state = el.getAttribute('state') || ''
			try { this.states = Library.controls[this.control] } catch (e) { return error('В библиотеке нет элемента ' + this.control, e) }
			try {
				this.el.src = this.states[this.state].image 
				this.el.title = this.dataId + ' | ' + this.control + ' | ' + this.states[this.state].text
			} catch (e) { return error('В библиотеке не хватает описания для ' + this.control, e) }

			// настройка отображения объекта
			if (el.hasAttribute('x')) {
				el.style.position = 'absolute'
				el.style.top = this.y + 'px'
				el.style.left = this.x + 'px'

				// разрешение перемещения элемента
				if (settings.admin) {
					$(self.el).draggable({
						stop: function () {
							self.x = Number(self.el.style.left.replace('px', ''))
							self.y = Number(self.el.style.top.replace('px', ''))
							Storage.save()
						}
					})
				}
			}

			el.oncontextmenu = function (e) {

				e.preventDefault()
				e.stopPropagation()

				/** @type {{[key: string]: Function}} */
				var actions = {}

				if (settings.editor) {
	
					Object.keys(self.states).forEach(function (key) {
						actions[self.states[key].text] = function () {
							self.state = key + ''
							self.update()
							Storage.save() 
						}
					})
				}
	
				if (settings.admin) {

					actions['[Admin] Копировать эл.'] = function () {
						Storage.copy(self.id)
					}
					actions['[Admin] Удалить эл.'] = function () {
						Storage.remove(self.id)
					}
				}

				ContextMenu(e, actions)
			}
		}

		return this
	}

	/** 
	 * Перемещаемый объект без состояния
	 * @param {HTMLImageElement} [el] HTML элемент, отображаемый на схеме
	 * @param {number} [x] Координата "left" в пикселях
	 * @param {number} [y] Координата "top" в пикселях
	 * @param {string} [movable] Определение типа
	 * */
	function Movable(el, x, y, movable) {

		// служебная переменная, позволяющая доступ к объекту в функциях
		var self = this

		// сохранение настроек объекта
		this.toHtml = function () {
			var elem = document.createElement('img')
			elem.setAttribute('data-id', String(ID++))
			elem.setAttribute('x', String(self.x))
			elem.setAttribute('y', String(self.y))
			elem.setAttribute('movable', self.movable || '')
			return elem
		}

		// обновление состояния объекта
		this.update = function () {
			// элемент не имеет состояния, кроме координат, поэтому изменений тоже нет
		}

		// Создание заглушки для добавления нового элемента
		if (!el) {
			this.x = x
			this.y = y
			this.movable = movable
			this.el = document.createElement('img')
		}
		// определение основных настроек объекта по html заглушке
		else {
			this.id = Math.random()
			this.el = el
			this.x = Number(el.getAttribute('x'))
			this.y = Number(el.getAttribute('y'))
			this.ID = Number(el.getAttribute('data-id'))
			this.movable = el.getAttribute('movable')
			try { this.lib = Library.movable[this.movable] } catch (e) { return error('В библиотеке нет элемента Movable: ' + this.movable, e) }
			try {
				this.el.src = this.lib.image 
				this.el.title = this.ID + ' | ' + this.lib.text
			} catch (e) { return error('В библиотеке не хватает описания для Movable: ' + this.movable, e) }

			// настройка отображения объекта
			if (el.hasAttribute('x')) {
				el.style.position = 'absolute'
				el.style.top = this.y + 'px'
				el.style.left = this.x + 'px'

				// разрешение перемещения элемента
				if (settings.admin || settings.editor) {
					$(self.el).draggable({
						stop: function () {
							self.x = Number(self.el.style.left.replace('px', ''))
							self.y = Number(self.el.style.top.replace('px', ''))
							Storage.save()
						}
					})
				}
			}

			el.oncontextmenu = function (e) {

				e.preventDefault()
				e.stopPropagation()

				/** @type {{[key: string]: Function}} */
				var actions = {}

				if (settings.editor) {
					actions['Убрать элемент'] = function () {
						Storage.remove(self.id)
					}
				}

				ContextMenu(e, actions)
			}
		}
	}

	/** 
	 * Элемент, представляющий изображение, меняющееся по условию.
	 * Характеризуется типом и тегом.
	 * Значение тега запрашивается из базы и определяет текущее состояние.
	 * По названию типа определяются доступные состояния, описываемые в файле библиотеки.
	 * @param {HTMLImageElement} [el]
	 * @param {Number} [x] Координата "left" в пикселях
	 * @param {Number} [y] Координата "top" в пикселях
	 * @param {String} [imageType] Тип изображения для поиска доступных состояний в библиотеке
	 * @param {String} [imageTag] Тег, используемый для хранения значения в базе данных
	 * @param {String} [defState] Состояние по умолчанию (если значение тега не получено или не задано)
	 * @return {ImageElementObject | void}
	 * */
	function ImageElement(el, x, y, imageType, imageTag, defState) {

		// служебная переменная, позволяющая доступ к объекту в функциях
		var self = /** @type {ImageElementObject} */(this)

		// сохранение настроек объекта
		this.toHtml = function () {
			var elem = document.createElement('img')
			elem.setAttribute('data-id', String(ID++))
			elem.setAttribute('x', String(self.x))
			elem.setAttribute('y', String(self.y))
			elem.setAttribute('image', self.imageType)
			elem.setAttribute('image-tag', self.imageTag)
			elem.setAttribute('def-state', self.defState)
			elem.setAttribute('name', self.name)
			return elem
		}

		this.first = true

		// обновление состояния объекта
		this.update = function () {
			// в объекте управления меняется state, в связи с чем меняется вид элемента
			// состояния описываются в отдельной json библиотеке
			var src = ''
			try {
				eval(self.evl)
				// проверяем, нужно ли обновлять
				if (self.first || self.el.getAttribute('src') != self.states[src].image) {
					self.el.src = self.states[src].image
					self.el.title = self.name + ': ' + self.states[src].text
					if (self.first) {
						self.first = false
					} else {
						self.el.setAttribute('highlight', String(settings.highlightTimeout))
					}
				}
			} catch (e) { 
				console.error(e)
				log('Ошибка при расчёте формулы в ImageElement: ' + self.imageTag + ' [' + self.evl + ']', 'yellow')
			}
		}

		if (!el) {
			this.x = x
			this.y = y
			this.imageType = imageType
			this.imageTag = imageTag
			this.defState = defState
			this.name = imageTag
			this.evl = "src=" + imageTag
		}
		else {
			// определение основных настроек объекта
			this.id = Math.random()
			this.el = el
			this.x = Number(el.getAttribute('x'))
			this.y = Number(el.getAttribute('y'))
			this.dataId = Number(el.getAttribute('data-id'))
			this.imageType = el.getAttribute('image') || ''
			this.imageTag = el.getAttribute('image-tag') || ''
			this.evl = el.getAttribute('image-evl') || ("src=" + this.imageTag)
			this.defState = el.getAttribute('def-state') || ''
			this.name = el.getAttribute('name') || ''
			try { 
				this.states = Library.images[this.imageType] 
				LibraryElements[this.imageTag] = this
			}
			catch (e) { return error('В библиотеке нет элемента ' + this.imageType, e) }
			try {
				this.el.src = this.states[this.defState].image 
				this.el.title = this.name + ': ' + this.states[this.defState].text
			}
			catch (e) { return error('В библиотеке не описано состояние ' + this.defState, e) }

			Insql.add([this.imageTag])

			// настройка отображения объекта
			if (el.hasAttribute('x')) {
				el.style.position = 'absolute'
				el.style.top = this.y + 'px'
				el.style.left = this.x + 'px'

				// разрешение перемещения элемента
				if (settings.admin) {
					$(self.el).draggable({
						stop: function () {
							self.x = Number(self.el.style.left.replace('px', ''))
							self.y = Number(self.el.style.top.replace('px', ''))
							Storage.save()
						}
					})
				}
			}

			el.oncontextmenu = function (e) {

				e.preventDefault()
				e.stopPropagation()

				/** @type {{[key: string]: Function}} */
				var actions = {}

				if (settings.editor) {
	
					Object.keys(self.states).forEach(function (key) {
						actions[self.states[key].text] = function () {
							req(settings.db.update, false, 'tag=' + self.imageTag + '&value=' + key, function (res) {
								try {
									var json = JSON.parse(res) 
									Insql.load()
									if (json.Done) log(json.Done)
									if (json.Error) error('Ошибка сервера в запросе сохранения: ', json.Error)
								} catch (e) {
									error('Ошибка при разборе ответа на запрос сохранения: ', e)
								}
							})
						}
					})
				}
	
				if (settings.admin) {
					actions['[Admin] Переименовать'] = function () {
						var name = prompt('Введите новое имя для объекта ' + self.name + ':', self.name)
						if (name) {
							self.name = name
							Storage.save(false)
						}
						Dialog(null)
					}
					actions['[Admin] Копировать'] = function () {
						Storage.copy(self.id)
						Dialog(null)
					}
					actions['[Admin] Удалить'] = function () {
						Storage.remove(self.id)
						Dialog(null)
					}
				}

				ContextMenu(e, actions)
			}

			// форма просмотра архивных данных
			el.onclick = function (e) {
				
				$.post(settings.db.history, { tag: self.imageTag, take: 10, skip: 0 })
					.done(function (json) {

						try { $dialog.dialog('close') } catch (e) {}
						$dialog = $(h('div', 
							h('table', 
								h('tr', 
									h('th', 'Время', { style: { width: '10em' } }),
									h('th', 'Состояние')
								),
								$.map(json.Data, function (el) { 
									return h('tr', 
										h('td', el.Date),
										h('td', self.states[el.Value].text)
									)
								})
							)
						))
							.dialog({ autoOpen: false, title: self.name })
							.dialog('option', 'position', { my: 'top', at: 'top', of: self.el })
							.dialog('open')
					})
			}
		}

		return /** @type {ImageElementObject} */(this)
	}
}

setTimeout(function() { location.reload() }, 3600000)

