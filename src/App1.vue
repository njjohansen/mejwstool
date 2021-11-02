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
    <button class="primary"
            @click="connect"
            :disabled="isConnecting || isConnected">
        Connect
    </button>
    <button @click="disconnect" :disabled="!isConnected">
        Disconnect
    </button>
    <hr />
    <subscription 
      v-for="(q, i) in queries"
      :key="i"
      :connection="connection" 
      style="display:flex;justify-content:space-between"
      :query="q" 
      :subscription-id="'my-subscription_' + i"
      ></subscription>
  </div>
</template>

<script>
import Subscription from './components/Subscription.vue'
const signalR = require("@microsoft/signalr");

export default {  
    components: {
        Subscription
    },
    data: () => {
      return {
        connection: null,
        //url: "https://api.cph-test3.airhart.aero/qs/api/ws/subscription",
        url: "http://localhost:5000/external/api/ws/subscription",
        accessToken: "",
      }
    },
    computed: {
      isConnecting () {
          return this.connection !== null && this.connection.state == "Connecting";
      },
      isConnected: function () {
          return this.connection !== null && this.connection.state == "Connected";
      },
      queries () {
        let select = "&$select=Id,LastModified,Attributes/scheduled_off_block_time/Value,Attributes/scheduled_in_block_time/Value,Attributes/scheduled_off_block_time/Received,Attributes/scheduled_in_block_time/Received"
        return [  
          "flight_legs?$top=1000" + select,
          "flight_legs?$top=1001" + select,
          "flight_legs?$top=1002" + select,
          "flight_legs?$top=1003" + select,
          "flight_legs?$top=1004" + select,
          "flight_legs?$top=1005" + select,
          "flight_legs?$top=1006" + select,
          "flight_legs?$top=1007" + select,
          "flight_legs?$top=1008" + select,
          "flight_legs?$top=1009" + select,
          "flight_legs?$top=1010" + select,
          "flight_legs?$top=1011" + select,
          "flight_legs?$top=1012" + select,
          "flight_legs?$top=1013" + select,
          "flight_legs?$top=1014" + select,
          "flight_legs?$top=1015" + select,
          "flight_legs?$top=1016" + select,
          "flight_legs?$top=1017" + select,
          "flight_legs?$top=1018" + select,
          "flight_legs?$top=1019" + select,
          "flight_legs?$top=1020" + select,
          "flight_legs?$top=1021" + select,
          "flight_legs?$top=1022" + select,
          "flight_legs?$top=1023" + select,
          "flight_legs?$top=1024" + select,
          "flight_legs?$top=1025" + select,
          "flight_legs?$top=1026" + select,
          "flight_legs?$top=1027" + select,
          "flight_legs?$top=1028" + select,
          "flight_legs?$top=1029" + select,
          
        ]
      }
    },
    methods: {
        disconnect() {
          if (!this.isConnected) return;
          this.connection.stop()
        },
         connect() {
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
label {
  display:block;
}

input {
  width: 100%;
}
</style>
