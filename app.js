const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  let jwtToken;
  const getUserQuery = `SELECT * FROM user
    WHERE username='${username}'`;
  const userDetails = await db.get(getUserQuery);
  console.log(userDetails);
  if (userDetails === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordCrt = await bcrypt.compare(password, userDetails.password);
    if (isPasswordCrt === true) {
      const payload = {
        username: username,
      };
      jwtToken = jwt.sign(payload, "lokijuhygtf");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

let convertDbObjectToStateObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

let convertDbObjectToDistrictObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//getting a list of all states in the state table

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "lokijuhygtf", (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;

        next();
      }
    });
  }
};

app.get("/states/", authenticateToken, async (request, response) => {
  let getState = `SELECT *
    FROM state
    ORDER BY 
    state_id;`;
  statesArray = await db.all(getState);
  response.send(statesArray.map((each) => convertDbObjectToStateObject(each)));
});

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  let { stateId } = request.params;
  let getState = `SELECT *
    FROM state
    WHERE 
    state_id=${stateId};`;
  statesArray = await db.get(getState);
  response.send(convertDbObjectToStateObject(statesArray));
});

//creating district in the district table

app.post("/districts/", authenticateToken, async (request, response) => {
  let { districtName, stateId, cases, cured, active, deaths } = request.body;

  let postDistrict = `insert into district(
       district_name,
state_id,
cases,
cured,
active,
deaths
  )VALUES(
      '${districtName}',
${stateId},
${cases},
${cured},
${active},
${deaths}
  )
  `;
  district = await db.run(postDistrict);
  response.send("District Successfully Added");
});

//getting district based on the district ID
app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    let { districtId } = request.params;
    let getDistrict = `SELECT *
    FROM district
    WHERE 
    district_id=${districtId};`;

    district = await db.get(getDistrict);

    response.send(convertDbObjectToDistrictObject(district));
  }
);

//Deletes a district from the district table based on the district ID
app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    let { districtId } = request.params;
    let getDistrict = `DELETE 
    FROM district
    WHERE 
    district_id=${districtId};`;
    deleteDistrict = await db.run(getDistrict);
    response.send("District Removed");
  }
);
//Updating the details of a specific district based on the district ID

app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    let { districtName, stateId, cases, cured, active, deaths } = request.body;
    let { districtId } = request.params;

    let updateDistrict = `UPDATE district
  SET 
    district_name =  '${districtName}',
     state_id =${stateId},
      cases=${cases},
cured = ${cured},
 active = ${active},
deaths= ${deaths}
  WHERE 
  district_id=${districtId};
  `;
    district = await db.run(updateDistrict);
    response.send("District Details Updated");
  }
);

/* getting the statistics of total cases, cured, 
active, deaths of a specific state based on state ID*/
app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    let { stateId } = request.params;
    console.log(stateId);
    let getDistrict = `SELECT sum(cases) as totalCases,
     sum(cured) as totalCured,
     sum(active) as totalActive,
     sum(deaths) as totalDeaths
    FROM district
    WHERE 
      state_id=${stateId}
      GROUP BY state_id;`;
    district = await db.get(getDistrict);
    console.log(district);
    response.send(district);
  }
);

module.exports = app;
