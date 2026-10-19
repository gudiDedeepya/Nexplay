import assert from "node:assert/strict";
import { test } from "node:test";
import { filterVenuesByPrice } from "../frontend/src/utils/filterVenues.js";

const venues = [
  { name: "Budget Court", location: "Tirupati", pricePerHour: 300 },
  { name: "Midrange Court", location: "Chennai", pricePerHour: 500 },
  { name: "Premium Court", location: "Tirupati", pricePerHour: 900 },
  { name: "Invalid Price Court", location: "Chennai", pricePerHour: "unknown" }
];

test("venue price filters include their boundaries and combine min and max", () => {
  assert.deepEqual(
    filterVenuesByPrice(venues, "300", "500").map((venue) => venue.name),
    ["Budget Court", "Midrange Court"]
  );
  assert.deepEqual(
    filterVenuesByPrice(venues, "500").map((venue) => venue.name),
    ["Midrange Court", "Premium Court"]
  );
  assert.deepEqual(
    filterVenuesByPrice(venues, "", "500").map((venue) => venue.name),
    ["Budget Court", "Midrange Court"]
  );
  assert.deepEqual(
    filterVenuesByPrice(venues, "", "", "tIrUpAtI").map((venue) => venue.name),
    ["Budget Court", "Premium Court"]
  );
  assert.deepEqual(
    filterVenuesByPrice(venues, "", "", "MIDRANGE").map((venue) => venue.name),
    ["Midrange Court"]
  );
});
