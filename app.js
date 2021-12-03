const express = require("express");
const { open } = require("sqlite");

const sqlite3 = require("sqlite3");
const path = require("path");

let covid19 = express();
covid19.use(express.json());

let dbPath = path.join(__dirname, "covid19India.db");
let database = null;

let initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    covid19.listen(3000, () => {
      console.log("server is running...");
      console.log(database);
    });
  } catch (error) {
    console.log(error.message);
  }
};
initializeDbAndServer();

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

covid19.get("/states/", async (request, response) => {
  let getState = `SELECT *
    FROM state
    ORDER BY 
    state_id;`;
  statesArray = await database.all(getState);
  response.send(statesArray.map((each) => convertDbObjectToStateObject(each)));
});

//getting state based on the state ID
covid19.get("/states/:stateId/", async (request, response) => {
  let { stateId } = request.params;
  let getState = `SELECT *
    FROM state
    WHERE 
    state_id=${stateId};`;
  statesArray = await database.get(getState);
  response.send(convertDbObjectToStateObject(statesArray));
});

//creating district in the district table

covid19.post("/districts/", async (request, response) => {
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
  district = await database.run(postDistrict);
  response.send("District Successfully Added");
});

//getting district based on the district ID
covid19.get("/districts/:districtId/", async (request, response) => {
  let { districtId } = request.params;
  let getDistrict = `SELECT *
    FROM district
    WHERE 
    district_id=${districtId};`;
  console.log(getDistrict);
  district = await database.get(getDistrict);
  console.log(district);
  response.send(convertDbObjectToDistrictObject(district));
});

//Deletes a district from the district table based on the district ID
covid19.delete("/districts/:districtId/", async (request, response) => {
  let { districtId } = request.params;
  let getDistrict = `DELETE 
    FROM district
    WHERE 
    district_id=${districtId};`;
  deleteDistrict = await database.run(getDistrict);
  response.send("District Removed");
});

//Updating the details of a specific district based on the district ID

covid19.put("/districts/:districtId/", async (request, response) => {
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
  district = await database.run(updateDistrict);
  response.send("District Details Updated");
});

/* getting the statistics of total cases, cured, 
active, deaths of a specific state based on state ID*/
covid19.get("/states/:stateId/stats/", async (request, response) => {
  let { stateId } = request.params;
  let getDistrict = `SELECT sum(cases) as totalCases,
     sum(cured) as totalCured,
     sum(active) as totalActive,
     sum(deaths) as totalDeaths
    FROM district
    WHERE 
      state_id=${stateId}
      GROUP BY state_id;`;
  district = await database.get(getDistrict);
  console.log(getDistrict);
  console.log(district);
  response.send(district);
});

// getting an object containing the state name of a district based on the district ID
covid19.get("/districts/:districtId/details/", async (request, response) => {
  let { districtId } = request.params;
  let getDistrict = `SELECT state_name as stateName
    FROM district inner join state on district.state_id=
    state.state_id
    WHERE 
    district_id=${districtId};`;
  district = await database.get(getDistrict);
  response.send(district);
});

module.exports = covid19;
