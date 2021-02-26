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
          ingredients: el.innerHTML
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean),
        }));

        const steps = Array.from(stepElements).map((el) => el.innerHTML.trim());

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

function App({ error, recipes, recipeFromUrl }) {
  const [recipe, setRecipe] = React.useState(recipeFromUrl);
  const [showImagePlaceholder, setShowImagePlaceholder] = React.useState(true);

  function openRecipe(selectedRecipe) {
    setRecipe(selectedRecipe);
    window.scrollTo(0, 0);
    history.pushState({}, null, `/?r=${selectedRecipe.name}`);
  }

  function goHome() {
    setRecipe(null);
    history.pushState({}, null, `/`);
  }

  React.useEffect(() => {
    window.onpopstate = () => {
      const recipeName = getRecipeNameFromUrl();
      const selectedRecipe = recipes.find((r) => r.name === recipeName);
      setRecipe(selectedRecipe);
    };
  }, []);

  if (error) {
    return div("Error", {}, error || "Error");
  }

  if (recipe == null) {
    // prettier-ignore
    return div("Contents", {},
      div("Contents_top", {},
        img("Contents_logo", "logo.png", {}),
        div("Contents_titles", {},
          div("Contents_title1", {}, "Max & Eleanor"),
          div("Contents_title2", {}, "Chop It Like It’s Hot"))),
      div("Contents_toc_title", {}, "Table of Contents"),
      div("Contents_toc", {},
        recipes.map((recipe) => (
          div("Contents_toc_item", { key: recipe.name, onClick: () => openRecipe(recipe) }, recipe.title)
        ))
      )
    );
  }

  // prettier-ignore
  return div("Recipe", {},
    div("Recipe_top", {},
      div("Recipe_logo_link", { onClick: goHome },
        img("Recipe_logo", "logo.png", {})),
      div("Recipe_title", {}, recipe.title)),
    recipe.inspiration && (
      div("Recipe_inspiration", {},
        div("Recipe_inspiration_label", {}, "Inspiration:"),
        a("Recipe_inspiration_link", recipe.inspiration.url, {}, recipe.inspiration.text))),
    div("Recipe_banner", {},
      recipe.prePrepTime && (
        div("Recipe_banner_item", {},
          div("Recipe_banner_item_heading", {}, "Pre-Prep Time"),
          div("Recipe_banner_item_value", {}, recipe.prePrepTime))),
      recipe.prepTime && (
        div("Recipe_banner_item", {},
          div("Recipe_banner_item_heading", {}, "Prep Time"),
          div("Recipe_banner_item_value", {}, recipe.prepTime))),
      recipe.cookTime && (
        div("Recipe_banner_item", {},
          div("Recipe_banner_item_heading", {}, "Cook Time"),
          div("Recipe_banner_item_value", {}, recipe.cookTime))),
      recipe.serves && (
        div("Recipe_banner_item", {},
          div("Recipe_banner_item_heading", {}, "Serves"),
          div("Recipe_banner_item_value", {}, recipe.serves)))),

    recipe.images && recipe.images.length > 0 && (
      div('Recipe_image_right_container ' + (showImagePlaceholder ? 'placeholder' : ''), {},
        img('Recipe_image_right', `/images/${recipe.images[0]}`, { onLoad: () => setShowImagePlaceholder(false) }))),

    div('Recipe_ingredients_title', {}, "Ingredients"),
    div('Recipe_ingredients', {},
      recipe.ingredientLists.map((list, index) => (
        div('Recipe_ingredient_list', { key: index },
          list.title && div('Recipe_ingredient_list_title', { key: index }, list.title),
          list.ingredients.map(ingredient =>
            div('Recipe_ingredient', { key: ingredient, dangerouslySetInnerHTML: { __html: ingredient } })))))),

    div('Recipe_method_title', {}, "Method"),
    div('Recipe_steps', {},
      recipe.steps.map((step, index) => (
        div('Recipe_step', { key: index, dangerouslySetInnerHTML: { __html: step } })))),

    recipe.images && recipe.images.length > 1 && (
      div('Recipe_images_after', {},
        recipe.images.slice(1).map((image) => (
          img('Recipe_image_after', `/images/${image}`, { key: image })))))
  )
}

//
// Load

async function load() {
  try {
    const recipes = await fetchRecipes();
    const recipeName = getRecipeNameFromUrl();
    const recipeFromUrl = recipes.find((r) => r.name === recipeName);
    return { recipes, recipeFromUrl };
  } catch (error) {
    return { error: error.message || error };
  }
}

window.addEventListener("load", async () => {
  const props = await load();

  ReactDOM.render(
    React.createElement(App, props),
    document.getElementById("root")
  );

  if ("serviceWorker" in navigator && location.hostname != "localhost") {
    navigator.serviceWorker.register("/sw.dist.js");
  }
});
