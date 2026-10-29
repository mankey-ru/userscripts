// ==UserScript==
// @name         [Lepro] Lepro Total Comments JS
// @description  Для Лепрозория. Взат здесь: https://github.com/lynxtaa/Lepro-Total-Comments и чутка допилен
// @author       lynxtaa, mankey-ru
// @namespace    mankey-ru/lepro-total-comments
// @version      1.65
// @match        http://leprosorium.ru/comments/*
// @match        http://*.leprosorium.ru/comments/*
// @match        http*://leprosorium.ru/comments/*
// @match        http*://*.leprosorium.ru/comments/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=leprosorium.ru
// @copyright    2016, lynxtaa
// @grant        none
// @downloadURL  https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/lepro-total-comments.user.js
// ==/UserScript==


"use strict";
(() => {
  // scripts/lepro-total-comments/lepro-total-comments.user.ts
  var BEST_THRESHOLD = 0.75;
  init();
  function init() {
    const controls = document.getElementById("js-comments")?.querySelector(".b-comments_controls");
    const holder = document.getElementById("js-comments_holder");
    const sortLink = controls?.querySelector('a[data-key="sort"]');
    if (!controls || !holder || !sortLink) {
      console.error("Lepro Total Comments: required elements not found", {
        controls,
        holder,
        sortLink
      });
      return;
    }
    const style = document.createElement("style");
    style.textContent = ".is_hidden { display: none; }";
    document.body.appendChild(style);
    sortLink.className = "";
    const best = document.createElement("a");
    const all = document.createElement("a");
    best.textContent = "\u043B\u0443\u0447\u0448\u0438\u0435";
    all.textContent = "\u0432\u0441\u0435";
    controls.append(best, all);
    let isFiltered = false;
    best.addEventListener("click", (e) => {
      e.preventDefault();
      if (best.className === "active") return;
      best.className = "active";
      all.className = "";
      if (isFiltered) {
        document.body.appendChild(style);
        return;
      }
      const votes = Array.from(holder.querySelectorAll("strong.vote_result"));
      const ratings = votes.map((el) => +el.textContent);
      const stdDev = positiveStdDev(ratings);
      if (stdDev === null) return;
      isFiltered = true;
      let shown = votes.length;
      votes.forEach((vote, i) => {
        if (ratings[i] / stdDev >= BEST_THRESHOLD) return;
        getVoteComment(vote).classList.add("is_hidden");
        shown--;
      });
      best.title = String(shown);
    });
    all.addEventListener("click", (e) => {
      e.preventDefault();
      if (!isFiltered) return;
      all.className = "active";
      best.className = "";
      style.remove();
    });
  }
  function positiveStdDev(ratings) {
    const positive = ratings.filter((rating) => rating > 0);
    if (!positive.length) return null;
    let sum = 0;
    let squareSum = 0;
    for (const rating of positive) {
      sum += rating;
      squareSum += Math.pow(rating, 2);
    }
    return Math.sqrt(squareSum / positive.length - Math.pow(sum / positive.length, 2));
  }
  function getVoteComment(vote) {
    let comment = vote;
    for (let i = 0; i < 4 && comment; i++) comment = comment.parentElement;
    if (!comment?.classList.contains("comment")) throw Error("Can't find comment.");
    return comment;
  }
})();
