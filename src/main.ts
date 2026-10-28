import { createApp } from "vue";

import App from "./App.vue";

// Same load order as the Kinabase UI package (minus the icon font). Imported one by one from JS because a
// Sass @import of a .css file is hoisted above Bootstrap and loses the cascade.
import "./styles/variables.scss";
import "./styles/app.css";
import "./styles/focus-visible.css";
import "./styles/colours.scss";
import "./styles/button.scss";
import "./styles/input.scss";
import "./styles/tool.scss";

createApp(App).mount("#app");
