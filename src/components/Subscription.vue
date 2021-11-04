<template>
  <div>
    <div>
      <button class="primary" @click="getRestData">
        Get
      </button>
      <button class="primary" @click="subscribe" :disabled="!isConnected || isConnecting || isSubscribed">
        Subscribe
      </button>
      <button @click="unsubscribe" :disabled="!isSubscribed">
        Unsubscribe
      </button>
    </div>
    <div>{{ queryTime }}s.</div>
    <div>
      {{ metrics.count }}
    </div>
    <div>
      {{ formatBytes(metrics.totalSize) }}
    </div>
    <div>
      {{ stateInitialized ? "complete" : isSubscribed ? "loading" : "not subscribed" }}
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "Subscription",
  props: {
    connection: {
      type: Object,
      required: false,
    },
    query: {
      type: String,
      required: true,
    },
    subscriptionId: {
      type: String,
      required: true,
    },
    restUrl: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
  },
  data: () => {
    return {
      streaming: false,
      metrics: {},
      queryStartTime: null,
      lastMessageReceived: null,
      stateInitialized: false,
      lastModifiedEntity: null,
    };
  },
  mounted() {
    this.resetMetrics();
  },
  computed: {
    queryTime() {
      return (this.lastMessageReceived - this.queryStartTime) / 1000;
    },
    isSubscribed: function() {
      return this.isConnected && this.streaming;
    },
    isConnecting() {
      return this.connection !== null && this.connection.state == "Connecting";
    },
    isConnected: function() {
      return this.connection !== null && this.connection.state == "Connected";
    },
    axiosConfig() {
      return {
        headers: {
          Authorization: "Bearer " + this.accessToken,
        },
      };
    },
  },
  methods: {
    resetMetrics() {
      this.queryStartTime = Date.now();
      this.lastMessageReceived = Date.now();
      this.stateInitialized = false;
      this.metrics = {
        count: 0,
        totalSize: 0,
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
    getRestData() {
      this.resetMetrics();
      axios
        .get(this.restUrl + "/" + this.query, this.axiosConfig)
        .then((response) => {
          let result = response.data.value;
          if (result.length <= 0) return;
          this.lastModifiedEntity = (({ Id, LastModified }) => ({ Id, LastModified }))(
            result.slice().sort((a, b) => (a.LastModified > b.LastModified ? -1 : 1))[0]
          );
          this.lastMessageReceived = Date.now();
          this.metrics.count = result.length;
          this.metrics.totalSize = JSON.stringify(result).length;
        })
        .catch((e) => {
          console.log("Error", e);
        });
    },
    subscribe() {
      this.streaming = true;
      if (this.lastModifiedEntity === null) {
        this.resetMetrics();
      }
      console.log("Subscribing to ", this.query);
      let payload = {
        SubscriptionId: this.subscriptionId,
        Query: this.query,
        //QueryState: this.lastModifiedEntity.LastModified === null ? null : this.lastModifiedEntity
        QueryState: this.lastModifiedEntity,
      };
      this.connection.stream("Subscribe", payload).subscribe({
        next: (item) => {
          //console.log("Received", item)
          if (item.type == "InitializationCompleted") {
            this.stateInitialized = true;
            console.log("Recevied 'InitializationCompleted'");
            return;
          }

          this.metrics.count++;
          this.metrics.totalSize += JSON.stringify(item).length;
          this.lastMessageReceived = Date.now();
          /*var a = 0;
                        for (var i = 0; i < 100000000; i++){
                            // nop
                            a = i * i;
                        }*/
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
  },
};
</script>
