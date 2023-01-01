const { Pool } = require("pg");
const pool = new Pool({
  host: "localhost",
  database: "lightbnb",
});

/// Users

const whereAndCheck = function (data) {
  if (data.length === 0) {
    return "WHERE";
  } else {
    return "AND";
  }
};

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  let user;
  for (const userId in users) {
    user = users[userId];
    if (user.email.toLowerCase() === email.toLowerCase()) {
      break;
    } else {
      user = null;
    }
  }
  return Promise.resolve(user);
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */

const getUserWithId = (id) => {
  return pool
    .query(`SELECT * FROM users WHERE id = $1`, [id])
    .then((result) => result.rows[0])
    .catch((err) => console.log(err.message));
};

exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */

const addUser = (user) => {

  const queryString = `
  INSERT INTO users (name, email, password) 
  VALUES ($1, $2, $3)
  RETURNING *;
  `;
  const values = [user.name, user.email, user.password];

  return pool
    .query(queryString, values)
    .then((result) => result.rows[0])
    .catch((err) => console.log(err.message));

};

exports.addUser = addUser;



/// Reservations ------------------------------------------------

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */


const getAllReservations = (guest_id, limit = 10) => {
  // const sql = `
  //   SELECT properties.*, reservations.*, avg(rating) as average_rating
  //   FROM reservations
  //   JOIN properties ON reservations.property_id = properties.id
  //   JOIN property_reviews ON properties.id = property_reviews.property_id 
  //   WHERE reservations.guest_id = $1
  //   AND reservations.end_date < now()::date
  //   GROUP BY properties.id, reservations.id
  //   ORDER BY reservations.start_date
  //   LIMIT $2;
  // `;
  // const values = [guest_id, limit];

  const sql = `
  SELECT properties.*, reservations.*, avg(rating) as average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id 
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;
`;
const values = [guest_id, limit];

  return pool
  .query(sql, values)
  .then((result) => result.rows);
};

exports.getAllReservations = getAllReservations;

/// Properties --------------------------------------------------

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const getAllProperties = (options, limit = 10) => {

  const queryParams = [];
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `${whereAndCheck(queryParams)} city LIKE $${queryParams.length} `;
  }

  if (options.owner_id) {
    queryParams.push(`${options.owner_id}`);
    queryString += `${whereAndCheck(queryParams)} owner_id = $${queryParams.length} `;
  }

  if (options.minimum_price_per_night) {
    queryParams.push(`${options.minimum_price_per_night * 100}`);
    queryString += `${whereAndCheck(queryParams)} cost_per_night >= $${queryParams.length} `;
  }

  if (options.maximum_price_per_night) {
    queryParams.push(`${options.maximum_price_per_night * 100}`);
    queryString += `${whereAndCheck(queryParams)} cost_per_night <= $${queryParams.length} `;
  }

// Alternate version of code above
  // const queryParams = [];
  // let queryString = `
  // SELECT properties.*, avg(property_reviews.rating) as average_rating
  // FROM properties
  // JOIN property_reviews ON properties.id = property_id
  // WHERE TRUE
  // `;

  // if (options.city) {
  //   queryParams.push(`%${options.city}%`);
  //   queryString += `AND city LIKE $${queryParams.length} `;
  // }

  // if (options.owner_id) {
  //   queryParams.push(`${options.owner_id}`);
  //   queryString += `AND owner_id = $${queryParams.length} `;
  // }

  // if (options.minimum_price_per_night) {
  //   queryParams.push(`${options.minimum_price_per_night * 100}`);
  //   queryString += `AND cost_per_night >= $${queryParams.length} `;
  // }

  // if (options.maximum_price_per_night) {
  //   queryParams.push(`${options.maximum_price_per_night * 100}`);
  //   queryString += `AND cost_per_night <= $${queryParams.length} `;
  // }

  queryString += `
  GROUP BY properties.id
  `;

  if (options.minimum_rating) {
    queryParams.push(`${options.minimum_rating}`);
    queryString += `HAVING avg(property_reviews.rating) >= $${queryParams.length} `;
  }

  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  console.log(queryString, queryParams);

  return pool
    .query(queryString, queryParams)
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 * 
 */

 const addProperty = (properties) => {

  const queryString = `
  INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms) 
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING *;
  `;

  const values = [
    properties.owner_id,
    properties.title,
    properties.description,
    properties.thumbnail_photo_url,
    properties.cover_photo_url,
    properties.cost_per_night,
    properties.street,
    properties.city,
    properties.province,
    properties.post_code,
    properties.country,
    properties.parking_spaces,
    properties.number_of_bathrooms,
    properties.number_of_bedrooms
  ];

  return pool
    .query(queryString, values)
    .then((result) => {
      console.log(result.rows[0]);
      return result.rows[0];
    })
    .catch((err) => console.log(err.message));

};

exports.addProperty = addProperty;