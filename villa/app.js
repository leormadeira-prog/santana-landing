(function () {
  "use strict";
  var form = document.getElementById("leadForm");
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    var name = document.getElementById("name").value.trim();
    if (!name) { document.getElementById("name").focus(); return; }
    var message = "Olá! Sou " + name + ". Tenho interesse no VILLA Milano Life Style by Versace Home, em Moema.";
    message += "\nInteresse: " + document.getElementById("interest").value;
    var extra = document.getElementById("msg").value.trim();
    if (extra) message += "\n" + extra;
    message += "\nEmpreendimento: villa";
    window.location.assign("https://wa.me/5511926271721?text=" + encodeURIComponent(message));
  });
})();
