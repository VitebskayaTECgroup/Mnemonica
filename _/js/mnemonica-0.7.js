if (window.NodeList && !NodeList.prototype.forEach) {
	NodeList.prototype.forEach = Array.prototype.forEach || function (callback, thisArg) {
		thisArg = thisArg || window;
		for (var i = 0; i < this.length; i++) {
			callback.call(thisArg, this[i], i, this)
		}
	}
}

function req(url, withCredentials, form, callback) {
	var xhr = new XMLHttpRequest()
	xhr.open(form ? 'POST' : 'GET', url + (url.indexOf('?') > -1 ? '&' : '?') + 'r=' + Math.random(), true)
	form && xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
	xhr.withCredentials = withCredentials
	xhr.onreadystatechange = function () {
		if (xhr.readyState != 4) return
		if (xhr.status >= 400) {
			error('Нет связи с сервером')
		}
		else if (callback) {
			callback.call(xhr, xhr.responseText)
		}
	}
	xhr.send(form)
}

var scale = Number(localStorage.getItem('scale'))
if (scale == 0) scale = 1

var container = document.querySelector('[zoom-source]')
if (container) {
	container.style.transform = `scale(${scale})`
	var min = Number(container.getAttribute('zoom-min') || '0.5')
	var max = Number(container.getAttribute('zoom-max') || '4')
	container.onwheel = function (e) {
		zoom(e, min, max)
	}
}

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
	container.style.transform = `scale(${scale})`

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
 * @param {HTMLElement} el 
 * @param {Object} hooks 
 */
function drag(el, hooks) {

	hooks = hooks || {};
	var coords;

	el.onmousedown = function (e) {

		if (e.button == 2) return
		el.classList.add('m-active')

		document.onkeydown = function (e) {
			if (e.code.indexOf('Arrow') < 0) return
			e.preventDefault()
			switch (e.code) {
				case 'ArrowDown':
					el.style.top = (Number(el.style.top.replace('px', '')) + 0.5) + 'px'
					break
				case 'ArrowUp':
					el.style.top = (Number(el.style.top.replace('px', '')) - 0.5) + 'px'
					break
				case 'ArrowLeft':
					el.style.left = (Number(el.style.left.replace('px', '')) - 0.5) + 'px'
					break
				case 'ArrowRight':
					el.style.left = (Number(el.style.left.replace('px', '')) + 0.5) + 'px'
					break
			}
		}

		document.onmouseup = function () {

			// Возврат исходного CSS
			//el.style.zIndex = zIndex

			// Сброс всех функций, добавленных на время перемещения
			document.onmousemove = null
			document.onmouseup = null
			document.onkeydown = null
			el.classList.remove('m-active')

			// Вызов операций по завершению перетаскивания
			if (hooks.after) hooks.after(el)
		}

		e.preventDefault()

		e = e || window.event;

		if (!e.which && e.button) {
			if (e.button & 1) e.which = 1;
			else if (e.button & 4) e.which = 2;
			else if (e.button & 2) e.which = 3;
		}

		if (e.which != 1) return;

		// Срабатывание только по клику на элемент внутри перемещаемого элемента
		if (hooks.handle) {
			if (!el.contains(e.target.closest(hooks.handle))) return;
		}

		// Действия при начале перетаскивания
		if (hooks.before) hooks.before(el);

		// Текущие координаты элемента
		coords = getCoords(el);
		el.style.position = 'absolute';

		// Координаты события до очередного тика перемещения
		var previousX = e.clientX;
		var previousY = e.clientY;

		// Отображение поверх всех других элементов на время перемещения
		//var zIndex = el.style.zIndex;

		// Отмена стандартного поведения браузера
		//el.style.zIndex = 9999;

		moveAt(e);

		/**
		 * @param {MouseEvent} e
		 */
		function moveAt(e) {

			e = e || window.event

			// Проверка, остается ли элемент в пределах родительского окна
			var shiftX = previousX - e.clientX;
			var shiftY = previousY - e.clientY;
			previousX = e.clientX;
			previousY = e.clientY;

			coords.left = coords.left - shiftX;
			coords.top = coords.top - shiftY;

			if (coords.left < 0) return;
			if (coords.top < 0) return;
			var scrollHeight = Math.max(
				document.body.scrollHeight, document.documentElement.scrollHeight,
				document.body.offsetHeight, document.documentElement.offsetHeight,
				document.body.clientHeight, document.documentElement.clientHeight
			);
			var scrollWidth = Math.max(
				document.body.scrollWidth, document.documentElement.scrollWidth,
				document.body.offsetWidth, document.documentElement.offsetWidth,
				document.body.clientWidth, document.documentElement.clientWidth
			);
			if (coords.left + coords.width > scrollWidth) return;
			if (coords.top + coords.height > scrollHeight) return;

			// Смещение элемента
			el.style.left = (coords.left / scale) + 'px';
			el.style.top = (coords.top / scale) + 'px';

			// Убираем выделение текста после перемещения
			if (window.getSelection) {
				window.getSelection().removeAllRanges();
			} else { // старый IE
				document.selection.empty();
			}
		}

		document.onmousemove = function (e) {
			moveAt(e)
		}

		/* document.onmouseup = function () {

			// Возврат исходного CSS
			el.style.zIndex = zIndex

			// Сброс всех функций, добавленных на время перемещения
			document.onmousemove = null
			document.onmouseup = null
			document.onkeydown = null

			// Вызов операций по завершению перетаскивания
			if (hooks.after) hooks.after(el)
		} */
	}

	el.ondragstart = function (e) {

		return false;
	}

	function getCoords(elem) {
		var box = elem.getBoundingClientRect();
		var offset = {
			top: document.body.scrollTop || document.documentElement.scrollTop || window.pageYOffset || 0,
			left: document.body.scrollLeft || document.documentElement.scrollLeft || window.pageXOffset || 0
		}
		return {
			top: box.top + offset.top,
			left: box.left + offset.left,
			width: (box.right - box.left),
			height: (box.bottom - box.top)
		}
	}
}

function R(number, digits) {
	let n = '1'
	digits = digits || 0
	try { while (digits--) n += '0' } catch (e) {}
	n = +n
	return Math.round(number * n) / n
}

document.querySelectorAll('[x]').forEach(function (el) {
	el.style.position = 'absolute'
	el.style.left = el.getAttribute('x') + 'px'
	el.style.top = el.getAttribute('y') + 'px'
})

document.querySelectorAll('[scheme]').forEach(function (el) {
	Mnemo(el)
})

//#region Работа модальных окон

/**
 * 
 * @param {MouseEvent} e 
 * @param {{ [key: string]: Function }} actions 
 */
function Popup(e, actions) {

	closePopup()

	var div = document.createElement('div')
	div.className = 'popup'
	div.style.cssText = 'z-index: 100; position: absolute; background: #333; color: #fff; cursor: pointer; font-family: \'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif; min-width: 12rem;'

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
			func.call()
			closePopup()
		}
		div.appendChild(s)
	}

	for (var key in actions) {
		action(key, actions[key])
	}
	action('Закрыть', function () {})

	document.body.appendChild(div)

	// позиционирование
	div.style.top = e.pageY + 'px'
	div.style.left = e.pageX + 'px'

	// корректировка на случай, если меню вылезает за пределы видимого окна
	let coords = div.getBoundingClientRect();
	let w = document.documentElement.clientWidth + document.documentElement.scrollLeft
	let h = document.documentElement.clientHeight + document.documentElement.scrollTop
	if ((e.pageX + coords.width + 10) > w) 
		div.style.left = (w - coords.width - 10) + 'px'
	if ((e.pageY + coords.height + 10) > h) 
		div.style.top = (h - coords.height - 10) + 'px'
}

function closePopup() {
	document.querySelectorAll('.popup').forEach(function (el) {
		el.parentNode.removeChild(el)
	})
}

document.addEventListener('click', function (e) {
	closePopup()
})

function log(text, type) {
	var container = document.getElementById('messages')
	if (!container) {
		container = document.createElement('div')
		container.setAttribute('id', 'messages')
		container.style.cssText = 'position: fixed; z-index: 2; left: 0; bottom: 0; vertical-align: bottom; width: 20em;'
		container.style.transform = 'scale(' + (1 / window.visualViewport.scale) + ')'
		document.body.appendChild(container)
	}

	var div = document.createElement('div')
	div.style.cssText = 'background: ' + (type || '#42d95c') + '; padding: 10px; font-family: system-ui; font-size: small; margin: 10px;'
	div.innerHTML = text
	container.appendChild(div)

	setTimeout(function () {
		container.removeChild(div)
	}, 3000)
}

function error(text, e) {
	console.error(text, e)
	return log(text, 'red')
}

//#endregion


/** @param {HTMLDivElement} container */
function Mnemo(container) {

	var old = ''

	if (!container) return error('Не найден корневой элемент схемы', '')
	var settings = {
		admins: (container.getAttribute('admins') || '').split(','),
		users: (container.getAttribute('users') || '').split(','),
		editor: false,
		admin: false,
		zoom: container.getAttribute('zoom') || null,
		fix: container.hasAttribute('fix') ? Number(container.getAttribute('fix')) : -1,
		blinkTimeout: container.hasAttribute('blink-timeout') ? Number(container.getAttribute('blink-timeout')) : -1,
		blinkCount: container.hasAttribute('blink-count') ? Number(container.getAttribute('blink-count')) : 10,
		highlightTimeout: container.hasAttribute('highlight-timeout') ? Number(container.getAttribute('highlight-timeout')) : -1,
		taglive: container.getAttribute('taglive') || '../_/asp/taglive.asp',
		create: container.getAttribute('create') || '../_/asp/create.asp',
		update: container.getAttribute('update') || '../_/asp/update.asp',
		delete: container.getAttribute('delete') || '../_/asp/delete.asp',
		timeout: container.hasAttribute('timeout') ? Number(container.getAttribute('timeout')) : 5000,
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
				objects.push(new ImageElement(sourceElement))
			}
			else if (sourceElement.hasAttribute('tags'))
				objects.push(new Item(sourceElement))
			else if (sourceElement.hasAttribute('control'))
				objects.push(new Control(sourceElement))
			else if (sourceElement.hasAttribute('movable'))
				objects.push(new Movable(sourceElement))
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

		function save(withReload) {
			var storage = document.createElement('div')
			objects.forEach(function (obj) {
				storage.appendChild(obj.toHtml())
				storage.insertAdjacentHTML('beforeend', '\n')
			})

			req('../_/asp/saver.asp?id=' + scheme, true, storage.innerHTML, function () {
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
		req('../_/asp/user.asp', true, {}, function (text) {
			if (settings.users.indexOf(text) > -1) settings.editor = true
			if (settings.admins.indexOf(text) > -1) settings.admin = true
			readyToWork[1] = true
		})
	}

	// Локальная библиотека элементов
	var Library = {
		controls: {},
		movable: {},
		images: {}
	}
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
			tags = 'tag=' + list.join(',')
		}

		function load () {
			req(settings.taglive, false, tags, function (data) {
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

		function start () {
			if (!enabled) return
			load()
			setInterval(load, settings.timeout)
		}

		return {
			add: add,
			start: start,
			load: load
		}
	})()

	EditorContext()

	if (container.innerHTML == '') {
		req(scheme + '.html?r=' + Math.random(), false, null, function (html) {
			container.innerHTML = html
			old = html
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
		
		container.querySelectorAll('[x],[tags],[static],[control],[movable]').forEach(function (el) {
			Storage.add(el)
		})
		Insql.start()

		if (settings.blinkTimeout > 0) {
			setInterval(BLINK, settings.blinkTimeout)
			BLINK()
		}

		if (settings.highlightTimeout > 0) {
			setInterval(Highlight, 1000)
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

			var actions = {}

			if (Library.movable) {
				Object.keys(Library.movable).forEach(function (mov) {
					try {
						actions[Library.movable[mov].text] = function () {
							Storage.create(new Movable(false, ev.pageX, ev.pageY, mov))
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
								req(settings.create, false, 'scheme=' + scheme + '&tag=&desc=&value=' + defState, function (text) {
									try {
										var json = JSON.parse(text)
										if (json.Done) log(json.Done)
										if (json.Tag) {
											Storage.create(new ImageElement(false, ev.pageX, ev.pageY, imageType, json.Tag, defState))
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
								Storage.create(new Control(false, ev.pageX, ev.pageY, ctrl, defState))
							}
						}
						catch (e) {
							return error('Неполное определение типа Control: ' + ctrl, e)
						}
					})
				}
			}

			Popup(ev, actions)
		}
	}

	function BLINK() {
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


	/** @param {HTMLElement} el */
	function Item(el) {

		// определение основных настроек объекта
		this.id = Math.random()
		this.el = el
		this.title = el.hasAttribute('title') ? el.getAttribute('title') : null
		this.tags = el.getAttribute('tags').split(',')
		this.evl = el.getAttribute('evl') || ('vl=' + this.tags[0])
		this.className = el.hasAttribute('class') ? el.className : null
		this.checksString = el.hasAttribute('checks') ? el.getAttribute('checks') : null
		this.checks = el.hasAttribute('checks') ? el.getAttribute('checks').split(',') : []
		this.classes = el.hasAttribute('classes') ? el.getAttribute('classes').split(',') : []
		this.text = el.innerHTML != '' ? el.innerHTML : null
		this.fix = el.hasAttribute('fix') ? Number(el.getAttribute('fix')) : -1
		this.x = Number(el.getAttribute('x'))
		this.y = Number(el.getAttribute('y'))
		this.check = -1
		this.vl = undefined
		this.first = true

		// служебная переменная, позволяющая доступ к объекту в функциях
		var self = this

		// настройка отображения объекта
		if (el.hasAttribute('x')) {
			el.style.position = 'absolute'
			el.style.top = this.y + 'px'
			el.style.left = this.x + 'px'

			// разрешение перемещения элемента
			if (settings.admin) {
				drag(this.el, {
					after: function () {
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
		if (this.classes.join('').toLowerCase().indexOf('blink_') > -1) this.el.setAttribute('blinkcount', 0)

		// определение типа
		this.mode = (el.getAttribute('type') || 'value').toLowerCase()
		switch (this.mode) {

			case 'image':
				this.modeUpdate = function (vl, ttl, src) {
					if (!src) {
						self.el.style.display = 'none'
					}
					else {
						self.el.src = src
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
					min: Number(el.getAttribute('scale-min') || 0),
					max: Number(el.getAttribute('scale-max') || 100),
					height: el.getAttribute('scale-height') || '10px',
					sub: subEl
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
					self.modeSettings.sub.innerHTML = R(vl, 2)
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

			var i,
				checks = self.checks

			if (self.checksString) {

				for (i = 0; i < checks.length; i++) {
					if (isNaN(Number(checks[i]))) {
						try {
							checks[i] = eval(checks[i])
						} catch (e) {
							checks[i] = 0
						}
					} else {
						checks[i] = Number(checks[i])
					}
				}

				for (i = 0; i < checks.length; i++) {
					if (vl <= checks[i]) {
						setRange(i)
						break
					}
				}

				if (vl > checks[checks.length - 1]) {
					setRange(checks.length)
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
				if (!hasBlinkBefore && self.el.className.toLowerCase().indexOf('blink_') > -1) self.el.setAttribute('blinkcount', 0)
			}
		}

		// сохранение настроек объекта
		this.toHtml = function () {
			var elem = self.el.cloneNode()
			elem.className = self.className
			elem.innerHTML = self.text || ''
			elem.setAttribute('data-id', ID++)
			elem.setAttribute('x', self.x)
			elem.setAttribute('y', self.y)
			elem.removeAttribute('style')
			if (self.title) { elem.title = self.title }
			else if (elem.hasAttribute('title')) { elem.removeAttribute('title') }
			return elem
		}

		// информационное окно по тегу
		this.el.oncontextmenu = function (e) {
			e.preventDefault()
			e.stopPropagation()

			var actions = {}
			self.tags.forEach(function (tag) {
				actions[tag] = function () {
					var a = document.createElement('a')
					a.style.display = 'none'
					a.target = '_blank'
					a.href = 'http://www.vst.vitebsk.energo.net/pages/query/#t=' + tag + '|q=' + tag + '|mode=table'
					document.body.appendChild(a)
					a.click()
				}
			})

			Popup(e, actions)

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
				drag(this.el, {
					after: function () {
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
			var elem = self.el.cloneNode(true)
			elem.setAttribute('data-id', ID++)
			elem.setAttribute('x', self.x)
			elem.setAttribute('y', self.y)
			elem.setAttribute('static', '')
			elem.removeAttribute('style')
			return elem
		}

		return this
	}

	/** @param {HTMLElement} el */
	function Control(el, x, y, control, state) {

		// служебная переменная, позволяющая доступ к объекту в функциях
		var self = this

		// сохранение настроек объекта
		this.toHtml = function () {
			var elem = document.createElement('img')
			elem.setAttribute('data-id', ID++)
			elem.setAttribute('x', self.x)
			elem.setAttribute('y', self.y)
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
			this.control = control
			this.state = state
		}
		else {
			// определение основных настроек объекта
			this.id = Math.random()
			this.el = el
			this.x = Number(el.getAttribute('x'))
			this.y = Number(el.getAttribute('y'))
			this.dataId = Number(el.getAttribute('data-id'))
			this.control = el.getAttribute('control')
			this.state = el.getAttribute('state')
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
					drag(this.el, {
						after: function () {
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

				Popup(e, actions)
			}
		}

		return this
	}

	/** @param {HTMLElement} el */
	function Movable(el, x, y, movable) {

		// служебная переменная, позволяющая доступ к объекту в функциях
		var self = this

		// сохранение настроек объекта
		this.toHtml = function () {
			var elem = document.createElement('img')
			elem.setAttribute('data-id', ID++)
			elem.setAttribute('x', self.x)
			elem.setAttribute('y', self.y)
			elem.setAttribute('movable', self.movable)
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
					drag(this.el, {
						after: function () {
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

				var actions = {}

				if (settings.editor) {
					actions['Убрать элемент'] = function () {
						Storage.remove(self.id)
					}
				}

				Popup(e, actions)
			}
		}
	}

	/** 
	 * Элемент, представляющий изображение, меняющееся по условию.
	 * Характеризуется типом и тегом.
	 * Значение тега запрашивается из базы и определяет текущее состояние.
	 * По названию типа определяются доступные состояния, описываемые в файле библиотеки.
	 * @param {HTMLElement} el 
	 * @param {Number} x Координата "left" в пикселях
	 * @param {Number} y Координата "top" в пикселях
	 * @param {String} imageType Тип изображения для поиска доступных состояний в библиотеке
	 * @param {String} imageTag Тег, используемый для хранения значения в базе данных
	 * @param {String} defState Состояние по умолчанию (если значение тега не получено или не задано)
	 * */
	function ImageElement(el, x, y, imageType, imageTag, defState) {

		// служебная переменная, позволяющая доступ к объекту в функциях
		var self = this

		// сохранение настроек объекта
		this.toHtml = function () {
			var elem = document.createElement('img')
			elem.setAttribute('data-id', ID++)
			elem.setAttribute('x', self.x)
			elem.setAttribute('y', self.y)
			elem.setAttribute('image', self.imageType)
			elem.setAttribute('image-tag', self.imageTag)
			elem.setAttribute('def-state', self.defState)
			return elem
		}

		this.first = true

		// обновление состояния объекта
		this.update = function () {
			// в объекте управления меняется state, в связи с чем меняется вид элемента
			// состояния описываются в отдельной json библиотеке
			var src
			try {
				eval(self.evl)
				// проверяем, нужно ли обновлять
				if (self.first || self.el.getAttribute('src') != self.states[src].image) {
					self.el.src = self.states[src].image
					self.el.title = self.states[src].text
					if (self.first) {
						self.first = false
					} else {
						self.el.setAttribute('highlight', String(settings.highlightTimeout))
					}
				}
			} catch (e) { 
				log('Ошибка при расчёте формулы в ImageElement: ' + self.imageTag + ' [' + self.evl + ']', 'yellow')
			}
		}

		if (!el) {
			this.x = x
			this.y = y
			this.imageType = imageType
			this.imageTag = imageTag
			this.defState = defState
			this.evl = "src=" + imageTag
		}
		else {
			// определение основных настроек объекта
			this.id = Math.random()
			this.el = el
			this.x = Number(el.getAttribute('x'))
			this.y = Number(el.getAttribute('y'))
			this.dataId = Number(el.getAttribute('data-id'))
			this.imageType = el.getAttribute('image')
			this.imageTag = el.getAttribute('image-tag')
			this.evl = el.getAttribute('image-evl') || ("src=" + this.imageTag)
			this.defState = el.getAttribute('def-state')
			try { 
				this.states = Library.images[this.imageType] 
			}
			catch (e) { return error('В библиотеке нет элемента ' + this.imageType, e) }
			try {
				this.el.src = this.states[this.defState].image 
				this.el.title = this.states[this.defState].text
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
					drag(this.el, {
						after: function () {
							self.x = Number(self.el.style.left.replace('px', ''))
							self.y = Number(self.el.style.top.replace('px', ''))
							Storage.save(false)
						}
					})
				}
			}

			el.oncontextmenu = function (e) {

				e.preventDefault()
				e.stopPropagation()

				var actions = {}

				if (settings.editor) {
	
					Object.keys(self.states).forEach(function (key) {
						actions[self.states[key].text] = function () {
							req(settings.update, false, 'tag=' + self.imageTag + '&value=' + key, function (res) {
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

					actions['[Admin] Копировать эл.'] = function () {
						Storage.copy(self.id)
					}
					actions['[Admin] Удалить эл.'] = function () {
						Storage.remove(self.id)
					}
				}

				Popup(e, actions)
			}
		}

		return this
	}
}

setTimeout(function() { location.reload() }, 3600000)