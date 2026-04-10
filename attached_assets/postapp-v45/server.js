
const express = require("express");
const app = express();
app.use(express.json());

let project = {
  id: "proj_123",
  name: "POSTAPP",
  timeline: []
};

function addEvent(type, message){
  project.timeline.unshift({
    id: "evt_"+Date.now(),
    type,
    message,
    time: new Date().toISOString()
  });
}

app.get("/api/project",(req,res)=>res.json(project));
app.get("/api/timeline",(req,res)=>res.json(project.timeline));

app.post("/api/run",(req,res)=>{
  addEvent("pipeline_start","Pipeline started");
  addEvent("pipeline_complete","Pipeline complete");
  res.json({ok:true});
});

app.listen(3000,()=>console.log("POSTAPP V45 running"));
