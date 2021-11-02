<template>
  <div>
    <label for="url">
        Endpoint
        <input v-model="url" />
    </label>
    <label for="access_token">
        Access token
        <input type="text" id="access_token" v-model="accessToken">
    </label>

    <label for="query">
        Query
        <input id="query" v-model="query" />
    </label>
    <button class="primary"
            @click="connect"
            :disabled="isConnecting || isConnected">
        Connect
    </button>
    <button @click="disconnect" :disabled="!isConnected">
        Disconnect
    </button>
    <button class="primary"
            @click="subscribe"
            :disabled="!isConnected || isConnecting || isSubscribed">
        Subscribe
    </button>
    <button @click="unsubscribe" :disabled="!isSubscribed">
      Unsubscribe
    </button>
    <input type="checkbox" v-model="showTable"/> 
    <div class="metrics" >
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
    <ag-grid-vue style="height: 500px;"
        class="ag-theme-alpine"
        :columnDefs="columnDefs"
        :rowData="rowData"
        v-if="showTable">
    </ag-grid-vue>
  </div>
</template>

<script>
//import HelloWorld from './components/HelloWorld.vue'
const signalR = require("@microsoft/signalr");
import { AgGridVue } from "ag-grid-vue";

function GetValue(obj, pathStr, split="/"){
    for (var i=0, path=pathStr.split(split), len=path.length; i<len; i++){
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
      AgGridVue
    },
    data: () => {
      return {
        connection: null,
        url: "https://api.sa-dev5.airhart.aero/qs/api/ws/subscription",
        //url: "http://localhost:5000/external/api/ws/subscription",
        subscriptionId: "mySubscriptionId",
        streaming: false,
        messages: [],
        metrics: {},
        queryStartTime: null,
        lastMessageReceived: null,
        accessToken: "",
        query: "flight_legs?$top=100",
        columnDefs: [
          { headerName: 'SIBT', sortable: true, field: "Attributes/scheduled_in_block_time/Value"},
          { headerName: 'SOBT', sortable: true, field: "Attributes/scheduled_off_block_time/Value"},
          { headerName: 'Operator', sortable: true, field: "Attributes/operator_iata/Value" },
          { headerName: 'Flight NO', sortable: true, field: "Attributes/flight_number_iata/Value" },
          { headerName: 'Flight Id', sortable: true, field: "Attributes/flight_identifier/Value" },
          { headerName: 'Aircraft Type', sortable: true, field: "Attributes/type_iata/Value" },
          { headerName: 'Final Station', sortable: true, field: "Attributes/final_station_iata/Value" },
          { headerName: 'Final Station / Time', sortable: true, field: "Attributes/final_station_iata/Received" },
        ],
        rowData: [],
        showTable: true
      }
    },
    mounted() {
    },
    computed: {
        queryTime() {
            return (this.lastMessageReceived - this.queryStartTime) / 1000;
        },
        isConnecting () {
            return this.connection !== null && this.connection.state == "Connecting";
        },
        isConnected: function () {
            return this.connection !== null && this.connection.state == "Connected";
        },
        isSubscribed: function () {
            return this.isConnected && this.streaming;
        },
        ODataSelect () {
          return ""; //"&$select=" + this.columnDefs.map(cd => cd.field).join(",")
        }
    },
    methods: {
        resetMetrics() {
            this.queryStartTime = Date.now();
            this.lastMessageReceived = Date.now();
            this.metrics = {
                documentDelivery: {
                    count: 0,
                    totalSize: 0
                }
            };
        },
        formatBytes(bytes, decimals = 2) {
            if (bytes === 0) return '0 Bytes';

            const k = 1024;
            const dm = decimals || 0;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

            const i = Math.floor(Math.log(bytes) / Math.log(k));

            const b = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
            const s = sizes[i];
            return `${b} ${s}`;
        },
        disconnect() {
            if (!this.isConnected) return;
            this.connection.stop()
        },
        subscribe() {
            this.streaming = true
            this.resetMetrics();
            this.rowData = [];
            console.log("Subscribing to '" + this.query + this.ODataSelect + "'")
            this.connection.stream("Subscribe", {
                    SubscriptionId: this.subscriptionId,
                    Query: this.query + this.ODataSelect,
                    QueryState: null
                })
                .subscribe({
                    next: (item) => {
                        //console.log("Received", item)
                        if (item.type == "InitializationCompleted"){
                            console.log("Recevied 'InitializationCompleted'")
                            return;
                        }

                        this.metrics.documentDelivery.count++;
                        this.metrics.documentDelivery.totalSize += JSON.stringify(item).length;
                        this.lastMessageReceived = Date.now();

                        // map object
                        let o = {}
                        this.columnDefs.forEach(cd => {
                          let f = cd.field
                          let path = cd.field
                          o[f] = GetValue(item.document, path)
                        })
                        this.rowData.push(o)
                    },
                    complete: () => {
                        console.log("completed")
                        this.streaming = false
                    },
                    error: (err) => {
                        console.log("stream error", err)
                        this.streaming = false
                    },
                });
        },
        unsubscribe () {
            if (!this.isConnected) return;
            this.connection.invoke("Unsubscribe",
                {
                    SubscriptionId: this.subscriptionId
                })
                .then(() => console.log("Unsubscribed"))
                .catch(e => console.log("Error when unsubscribing", e))
        },
        connect() {
            this.resetMetrics();
            
            this.connection = new signalR
                .HubConnectionBuilder()
                .withUrl(this.url,
                    {
                        transport: signalR.HttpTransportType.WebSockets,
                        skipNegotiation: true,
                        accessTokenFactory: () => {
                            return this.accessToken
                        }
                    })
                .configureLogging(signalR.LogLevel.Debug)
                .build();

            this.connection.onclose(() => {
                console.log("Connection closed");
            });

            return this
                .connection
                .start()
                .then(() => {
                    console.log("connected");
                })
                .catch(e => console.log("connection start error", e));
        }
    }
}
</script>

<style>
@import "../node_modules/ag-grid-community/dist/styles/ag-grid.css";
@import "../node_modules/ag-grid-community/dist/styles/ag-theme-alpine.css";

label {
  display:block;
}

input {
  width: 100%;
}
</style>
