// ==UserScript==
// @name         [Lepro] Lepro Total Comments JS
// @description  Для Лепрозория. Взат здесь: https://github.com/lynxtaa/Lepro-Total-Comments и чутка допилен
// @author       lynxtaa, mankey-ru
// @namespace    mankey-ru/lepro-total-comments
// @version      1.64
// @match        http://leprosorium.ru/comments/*
// @match        http://*.leprosorium.ru/comments/*
// @match        http*://leprosorium.ru/comments/*
// @match        http*://*.leprosorium.ru/comments/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=leprosorium.ru
// @copyright    2016, lynxtaa
// @grant        none
// @downloadURL  https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/lepro-total-comments.user.js
// ==/UserScript==

var BEST_TRESHOLD = 0.75, // Порог рейтинга, можно поиграться со значением
	hideComments = parseComments;

var all = document.createElement('a'),
	best = document.createElement('a'),
	controls = document.getElementById('js-comments').querySelector('.b-comments_controls'),
	holder = document.getElementById('js-comments_holder'),
	style = document.createElement('style');

style.textContent = '.is_hidden { display: none; }';
document.body.appendChild(style);

controls.querySelector('a[data-key="sort"]').className = '';

// Кнопки управления
best.textContent = 'лучшие';
all.textContent = 'все';
controls.appendChild(best);
controls.appendChild(all);

// Лучшие
best.addEventListener(
	'click',
	function (e) {
		e.preventDefault();

		if (this.className == 'active') return false;

		this.className = 'active';
		this.nextSibling.className = '';

		hideComments();
	},
	false,
);

// Показать всё
all.addEventListener(
	'click',
	function (e) {
		e.preventDefault();

		if (hideComments == parseComments) return false;

		this.className = 'active';
		this.previousSibling.className = '';

		document.body.removeChild(style);
	},
	false,
);

function parseComments() {
	var votes = [].slice.call(holder.querySelectorAll('strong.vote_result'));
	var abovenull = 0,
		rating_square_sum = 0,
		rating_sum = 0,
		shown = votes.length;

	var ratings = votes.map(function (el) {
		var rating = +el.textContent;

		if (rating > 0) {
			abovenull++;
			rating_sum += rating;
			rating_square_sum += Math.pow(rating, 2);
		}

		return { el, rating };
	});

	if (!abovenull) return null;

	var std_dev = Math.sqrt(rating_square_sum / abovenull - Math.pow(rating_sum / abovenull, 2));

	hideComments = function () {
		document.body.appendChild(style);
	};

	for (var i = ratings.length; i--; ) {
		if (ratings[i].rating / std_dev >= BEST_TRESHOLD) continue;

		var comment = ratings[i].el.parentNode.parentNode.parentNode.parentNode;
		if (!comment.classList.contains('comment')) throw Error("Can't find comment.");
		comment.classList.add('is_hidden');
		shown--;
	}

	best.setAttribute('title', shown);
}
