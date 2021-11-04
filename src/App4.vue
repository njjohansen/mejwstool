<template>
  <div>
    <label for="url">
      Endpoint
      <input v-model="url" />
    </label>
    <label for="access_token">
      Access token
      <input type="text" id="access_token" v-model="accessToken" />
    </label>
    <label for="query">
      Query
      <input id="query" v-model="query" />
    </label>
    <label for="filter">
      Filter
      <input id="filter" v-model="filter" />
    </label>
    <label for="select">
      Select
      <input id="select" v-model="select" />
    </label>
    <label for="table">
      Table
      <input id="select" v-model="table" />
    </label>
    <button class="primary" @click="connect" :disabled="isConnecting || isConnected">
      Connect
    </button>
    <button @click="disconnect" :disabled="!isConnected">
      Disconnect
    </button>
    <button class="primary" @click="subscribe" :disabled="!isConnected || isConnecting || isSubscribed">
      Subscribe
    </button>
    <button @click="unsubscribe" :disabled="!isSubscribed">
      Unsubscribe
    </button>
    <input type="checkbox" v-model="showTable" />
    <div class="metrics">
      Query Time: {{ queryTime }}s.
      <table>
        <tr>
          <th>Name</th>
          <th>Count</th>
          <th>Total size</th>
        </tr>
        <tr v-for="(m, k) in metrics" :key="k">
          <td>{{ k }}</td>
          <td>{{ m.count }}</td>
          <td>{{ formatBytes(m.totalSize) }}</td>
        </tr>
      </table>
    </div>
    <ag-grid-vue
      style="height: 500px;"
      class="ag-theme-alpine"
      :columnDefs="columnDefs"
      :rowData="rowData"
      v-if="showTable"
    >
    </ag-grid-vue>
  </div>
</template>

<script>
//import HelloWorld from './components/HelloWorld.vue'
const signalR = require("@microsoft/signalr");
import { AgGridVue } from "ag-grid-vue";

function GetValue(obj, pathStr, split = "/") {
  for (var i = 0, path = pathStr.split(split), len = path.length; i < len; i++) {
    obj = obj[path[i]];
  }
  return obj;
}

export default {
  filters: {
    json: (value) => {
      return JSON.stringify(value, null, 2);
    },
  },
  components: {
    AgGridVue,
  },
  data: () => {
    return {
      connection: null,
      url: "https://api.cph-test4.airhart.aero/qs/api/ws/subscription",
      subscriptionId: "mySubscriptionId",
      streaming: false,
      messages: [],
      metrics: {},
      queryStartTime: null,
      lastMessageReceived: null,
      accessToken: "",
      query: "flight_legs",
      filter:
        "(tolower(Attributes/schedule_status/Value) ne 'del' and (((Attributes/scheduled_in_block_time/Value ge now() sub duration'P0DT1H0M0S') and (Attributes/scheduled_in_block_time/Value le now() add duration'P0DT12H0M0S')) or ((Attributes/scheduled_off_block_time/Value ge now() sub duration'P0DT1H0M0S') and (Attributes/scheduled_off_block_time/Value le now() add duration'P0DT12H0M0S'))))",
      select:
        "Attributes/arrival_station_iata/Value,Attributes/arrival_station_iata/Received,Attributes/cancelled/Value,Attributes/cancelled/Received,Attributes/actual_aborted_landing_time/Value,Attributes/actual_aborted_landing_time/Received,Attributes/actual_aborted_take_off_time/Value,Attributes/actual_aborted_take_off_time/Received,Attributes/actual_ground_return_time/Value,Attributes/actual_ground_return_time/Received,Attributes/actual_diversion_time/Value,Attributes/actual_diversion_time/Received,Attributes/actual_airborne_return_time/Value,Attributes/actual_airborne_return_time/Received,Attributes/ramp_fuel/Value,Attributes/ramp_fuel/Received,Attributes/geopol_schengen/Value,Attributes/geopol_schengen/Received,Attributes/security_level/Value,Attributes/security_level/Received,Attributes/arrival_gate_traffic_type_mismatch/Value,Attributes/arrival_gate_traffic_type_mismatch/Received,Attributes/departure_gate_traffic_type_mismatch/Value,Attributes/departure_gate_traffic_type_mismatch/Received,Attributes/arrival_gate_security_level_mismatch/Value,Attributes/arrival_gate_security_level_mismatch/Received,Attributes/departure_gate_security_level_mismatch/Value,Attributes/departure_gate_security_level_mismatch/Received,Attributes/geopol_eu/Value,Attributes/geopol_eu/Received,Attributes/hide_flight_public/Value,Attributes/hide_flight_public/Received,Attributes/hide_estimated_departure_time_fids/Value,Attributes/hide_estimated_departure_time_fids/Received,Attributes/alert_highest_severity/Value,Attributes/alert_highest_severity/Received,Attributes/has_requested_deicing/Value,Attributes/has_requested_deicing/Received,Attributes/nmoc_status/Value,Attributes/nmoc_status/Received,Attributes/arrival_pax_bus_needed/Value,Attributes/arrival_pax_bus_needed/Received,Attributes/departure_pax_bus_needed/Value,Attributes/departure_pax_bus_needed/Received,Attributes/best_operation_time_type_arrival/Value,Attributes/best_operation_time_type_arrival/Received,Attributes/best_operation_time_type_departure/Value,Attributes/best_operation_time_type_departure/Received,Attributes/actual_landing_time/Value,Attributes/actual_landing_time/Received,Attributes/actual_take_off_time/Value,Attributes/actual_take_off_time/Received,Attributes/actual_startup_requested_time/Value,Attributes/actual_startup_requested_time/Received,Attributes/hide_flight_staff/Value,Attributes/hide_flight_staff/Received,Attributes/arrival_stand_gate_traffic_type_mismatch/Value,Attributes/arrival_stand_gate_traffic_type_mismatch/Received,Attributes/departure_stand_gate_traffic_type_mismatch/Value,Attributes/departure_stand_gate_traffic_type_mismatch/Received,Attributes/scheduled_in_block_time/Value,Attributes/scheduled_in_block_time/Received,Attributes/scheduled_off_block_time/Value,Attributes/scheduled_off_block_time/Received,Attributes/flight_identifier/Value,Attributes/flight_identifier/Received,Attributes/stand/Value,Attributes/stand/Received,Attributes/displayed_status/Value,Attributes/displayed_status/Received,Attributes/runway/Value,Attributes/runway/Received,Attributes/call_sign/Value,Attributes/call_sign/Received,Attributes/return_to_ramp/Value,Attributes/return_to_ramp/Received,Attributes/registration/Value,Attributes/registration/Received,Attributes/type_iata/Value,Attributes/type_iata/Received,Attributes/turn_to/Value,Attributes/turn_to/Received,Attributes/turn_from/Value,Attributes/turn_from/Received,Attributes/origin_station_iata/Value,Attributes/origin_station_iata/Received,Attributes/final_station_iata/Value,Attributes/final_station_iata/Received,Attributes/arrival_runway/Value,Attributes/arrival_runway/Received,Attributes/departure_runway/Value,Attributes/departure_runway/Received,Attributes/arrival_stand/Value,Attributes/arrival_stand/Received,Attributes/departure_stand/Value,Attributes/departure_stand/Received,Attributes/arrival_gate/Value,Attributes/arrival_gate/Received,Attributes/departure_gate/Value,Attributes/departure_gate/Received,Attributes/landing_time/Value,Attributes/landing_time/Received,Attributes/best_operation_time_arrival/Value,Attributes/best_operation_time_arrival/Received,Attributes/best_operation_time_departure/Value,Attributes/best_operation_time_departure/Received,Attributes/estimated_pax_off_block_time/Value,Attributes/estimated_pax_off_block_time/Received,Attributes/arrival_baggage_belt/Value,Attributes/arrival_baggage_belt/Received,Attributes/checkin_counter_allocation/Value,Attributes/checkin_counter_allocation/Received,Attributes/estimated_total_passenger_count/Value,Attributes/estimated_total_passenger_count/Received,Attributes/service_type/Value,Attributes/service_type/Received,Attributes/operational_status/Value,Attributes/operational_status/Received,Id,Relations,Attributes/route_iata_enriched/Value,Attributes/departure_station_iata/Value,Alerts",

      table:
        '[{ "headerName": "Id", "sortable": true, "field": "Id" }, { "headerName": "Arrival stattion", "sortable": true, "field": "Attributes/arrival_station_iata/Value" }]',
      columnDefs: [],
      rowData: [],
      showTable: true,
    };
  },
  mounted() {},
  computed: {
    queryTime() {
      return (this.lastMessageReceived - this.queryStartTime) / 1000;
    },
    isConnecting() {
      return this.connection !== null && this.connection.state == "Connecting";
    },
    isConnected: function() {
      return this.connection !== null && this.connection.state == "Connected";
    },
    isSubscribed: function() {
      return this.isConnected && this.streaming;
    },
    ODataSelect() {
      return "?$filter=" + this.filter + "&$select=" + this.select;
    },
  },
  methods: {
    resetMetrics() {
      this.queryStartTime = Date.now();
      this.lastMessageReceived = Date.now();
      this.metrics = {
        documentDelivery: {
          count: 0,
          totalSize: 0,
        },
      };
    },
    formatBytes(bytes, decimals = 2) {
      if (bytes === 0) return "0 Bytes";

      const k = 1024;
      const dm = decimals || 0;
      const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

      const i = Math.floor(Math.log(bytes) / Math.log(k));

      const b = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
      const s = sizes[i];
      return `${b} ${s}`;
    },
    disconnect() {
      if (!this.isConnected) return;
      this.connection.stop();
    },
    subscribe() {
      this.streaming = true;
      this.resetMetrics();
      this.columnDefs = JSON.parse(this.table);
      this.rowData = [];
      this.connection
        .stream("Subscribe", {
          SubscriptionId: this.subscriptionId,
          Query: this.query + this.ODataSelect,
          QueryState: null,
        })
        .subscribe({
          next: (item) => {
            //console.log("Received", item)
            this.metrics.documentDelivery.count++;
            this.metrics.documentDelivery.totalSize += JSON.stringify(item).length;
            this.lastMessageReceived = Date.now();

            // map object
            let o = {};
            this.columnDefs.forEach((cd) => {
              let f = cd.field;
              let path = cd.field;
              o[f] = GetValue(item.document, path);
            });
            this.rowData.push(o);
          },
          complete: () => {
            console.log("completed");
            this.streaming = false;
          },
          error: (err) => {
            console.log("stream error", err);
            this.streaming = false;
          },
        });
    },
    unsubscribe() {
      if (!this.isConnected) return;
      this.connection
        .invoke("Unsubscribe", {
          SubscriptionId: this.subscriptionId,
        })
        .then(() => console.log("Unsubscribed"))
        .catch((e) => console.log("Error when unsubscribing", e));
    },
    connect() {
      this.resetMetrics();

      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(this.url, {
          transport: signalR.HttpTransportType.WebSockets,
          skipNegotiation: true,
          accessTokenFactory: () => {
            return this.accessToken;
          },
        })
        .configureLogging(signalR.LogLevel.Debug)
        .build();

      this.connection.onclose(() => {
        console.log("Connection closed");
      });

      return this.connection
        .start()
        .then(() => {
          console.log("connected");
        })
        .catch((e) => console.log("connection start error", e));
    },
  },
};
</script>

<style scoped>
@import "../node_modules/ag-grid-community/dist/styles/ag-grid.css";
@import "../node_modules/ag-grid-community/dist/styles/ag-theme-alpine.css";
* {
  font-family: arial;
  font-size: 12px;
}

label {
  font-weight: bold;
  width: 100%;
  display: inline-block;
  margin-bottom: 10px;
}

input {
  float: right;
  width: calc(100% - 90px);
  display: inline-block;
}
</style>
