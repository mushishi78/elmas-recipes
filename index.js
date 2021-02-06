//
// Domain

function getRecipeNameFromUrl() {
  const url = new URL(location.href);
  return url.searchParams.get("r");
}

//
// Fetch

async function fetchRecipes() {
  const response = await fetch("/recipes/index");
  const text = await response.text();
  const recipesNames = text
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean);

  const recipes = await Promise.all(
    recipesNames.map(async (name) => {
      try {
        const xml = await fetchXml(`/recipes/${name}.xml`);

        const recipeElement = xml.querySelector("recipe");
        const inspirationElement = xml.querySelector("inspiration");
        const imageElements = xml.querySelectorAll("image");
        const ingredientsElements = xml.querySelectorAll("ingredients");
        const stepElements = xml.querySelectorAll("step");

        const title = recipeElement?.getAttribute("title");
        const prePrepTime = recipeElement?.getAttribute("pre-prep-time");
        const prepTime = recipeElement?.getAttribute("prep-time");
        const cookTime = recipeElement?.getAttribute("cook-time");
        const serves = recipeElement?.getAttribute("serves");

        const inspiration = inspirationElement && {
          text: inspirationElement?.getAttribute("text"),
          url: inspirationElement?.getAttribute("url"),
        };

        const images = Array.from(imageElements).map((el) =>
          el.getAttribute("url")
        );

        const ingredientLists = Array.from(ingredientsElements).map((el) => ({
          title: el.getAttribute("title"),
          ingredients: el.textContent
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean),
        }));

        const steps = Array.from(stepElements).map((el) =>
          el.textContent.trim()
        );

        return {
          name,
          xml,
          title,
          prePrepTime,
          prepTime,
          cookTime,
          serves,
          inspiration,
          images,
          ingredientLists,
          steps,
        };
      } catch (error) {
        console.error(error);
      }
    })
  );

  return recipes.filter(Boolean);
}

function fetchXml(url) {
  return new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "document";
    xhr.overrideMimeType("text/xml");

    xhr.onload = function () {
      if (
        xhr.readyState === xhr.DONE &&
        xhr.status === 200 &&
        xhr.responseXML != null
      ) {
        resolve(xhr.responseXML);
      } else {
        reject("Failed to load xml");
      }
    };

    xhr.send();
  });
}

//
// React helpers

function div(className, props, ...children) {
  return React.createElement("div", { className, ...props }, ...children);
}

function a(className, href, props, ...children) {
  return React.createElement("a", { className, href, ...props }, ...children);
}

function img(className, src, props, ...children) {
  return React.createElement("img", { className, src, ...props }, ...children);
}

//
// Components

function App({ page }) {
  if (page.type === "error") {
    return div("Error", {}, page.error || "Error");
  }

  if (page.type === "contents") {
    // prettier-ignore
    return div("Contents", {},
      div("Contents_top", {},
        img("Contents_logo", "logo.png", {}),
        div("Contents_titles", {},
          div("Contents_title1", {}, "Max & Eleanor"),
          div("Contents_title2", {}, "Chop It Like It’s Hot"))),
      div("Contents_toc_title", {}, "Table of Contents"),
      div("Contents_toc", {},
        page.recipes.map((recipe) => (
          a("Contents_toc_item", `/?r=${recipe.name}`, { key: recipe.name }, recipe.title)
        ))
      )
    );
  }

  if (page.type === "recipe") {
    // prettier-ignore
    return div("Recipe", {},
      div("Recipe_top", {},
        a("Recipe_logo_link", "/", {},
          img("Recipe_logo", "logo.png", {})),
        div("Recipe_title", {}, page.recipe.title)),
      page.recipe.inspiration && (
        div("Recipe_inspiration", {},
          div("Recipe_inspiration_label", {}, "Inspiration:"),
          a("Recipe_inspiration_link", page.recipe.inspiration.url, {}, page.recipe.inspiration.text))),
      div("Recipe_banner", {},
        page.recipe.prePrepTime && (
          div("Recipe_banner_item", {},
            div("Recipe_banner_item_heading", {}, "Pre-Prep Time"),
            div("Recipe_banner_item_value", {}, page.recipe.prePrepTime))),
        page.recipe.prepTime && (
          div("Recipe_banner_item", {},
            div("Recipe_banner_item_heading", {}, "Prep Time"),
            div("Recipe_banner_item_value", {}, page.recipe.prepTime))),
        page.recipe.cookTime && (
          div("Recipe_banner_item", {},
            div("Recipe_banner_item_heading", {}, "Cook Time"),
            div("Recipe_banner_item_value", {}, page.recipe.cookTime))),
        page.recipe.serves && (
          div("Recipe_banner_item", {},
            div("Recipe_banner_item_heading", {}, "Serves"),
            div("Recipe_banner_item_value", {}, page.recipe.serves)))),

      page.recipe.images && page.recipe.images.length > 0 && (
        img('Recipe_image_right', `/images/${page.recipe.images[0]}`, {})),

      div('Recipe_ingredients_title', {}, "Ingredients"),
      div('Recipe_ingredients', {},
        page.recipe.ingredientLists.map((list, index) => (
          div('Recipe_ingredient_list', { key: index },
            list.title && div('Recipe_ingredient_list_title', { key: index }, list.title),
            list.ingredients.map(ingredient =>
              div('Recipe_ingredient', { key: ingredient }, ingredient)))))),

      div('Recipe_method_title', {}, "Method"),
      div('Recipe_steps', {},
        page.recipe.steps.map((step, index) => (
          div('Recipe_step', { key: index }, step))))
    )
  }

  return null;
}

//
// Load

async function loadPage() {
  try {
    const recipes = await fetchRecipes();
    const recipeName = getRecipeNameFromUrl();
    const recipe = recipes.find((r) => r.name === recipeName);
    return recipe == null
      ? { type: "contents", recipes }
      : { type: "recipe", recipe };
  } catch (error) {
    return { type: "error", error: error.message || error };
  }
}

document.addEventListener("turbolinks:load", async () => {
  const page = await loadPage();

  ReactDOM.render(
    React.createElement(App, { page }),
    document.getElementById("root")
  );
});
