function buildDiscordWidgetEmbed({ selector, widgetURL, text }) {
	// Base container
	const base = document.createElement("div");

	Object.entries({
		left: 0,
		position: "fixed",
		top: 0
	}).forEach(([_property, _value]) => (base.style[_property] = _value));

	document.querySelector(selector).appendChild(base);

	// Toggle button
	const button = document.createElement("div");

	Object.entries({
		backgroundColor: "#111",
		borderRadius: "8px",
		bottom: 0,
		color: "#fff",
		cursor: "pointer",
		fontFamily: "Segoe UI, Arial, Helvetica, sans-serif",
		margin: "16px",
		padding: "16px",
		position: "fixed",
		right: 0,
		zIndex: 1
	}).forEach(([_property, _value]) => (button.style[_property] = _value));

	base.appendChild(button);

	// Button handler
	let toggled = false;

	button.onclick = () => {
		toggled = !toggled;
		render();
	};

	// iframe element
	const iframe = document.createElement("iframe");

	iframe.src = widgetURL;

	Object.entries({
		border: "none",
		height: "100%",
		position: "fixed",
		width: "100%"
	}).forEach(([_property, _value]) => (iframe.style[_property] = _value));

	base.appendChild(iframe);

	// Render function
	function render() {
		if (toggled) {
			button.innerText = text.close;
			button.style.bottom = null;
		} else {
			button.innerText = text.open;
			button.style.bottom = 0;
		}

		iframe.style.display = toggled ? null : "none";
	}

	render();
}
