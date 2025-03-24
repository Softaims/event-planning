const extractFilters = require("./chatGPT"); // Adjust path as needed

async function test() {
    const query = "People who love Drake and go to Cafés";
    const filters = await extractFilters(query);
    console.log(filters);
}

test();