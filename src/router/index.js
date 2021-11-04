import Vue from "vue";
import VueRouter from "vue-router";

Vue.use(VueRouter);

const routes = [
  {
    path: "/",
    name: "App2",
    component: () => import(/* webpackChunkName: ">App2" */ "../App2.vue"),
  },
  {
    path: "/App1",
    name: "App1",
    component: () => import(/* webpackChunkName: ">App1" */ "../App1.vue"),
  },
  {
    path: "/App2",
    name: "App2",
    component: () => import(/* webpackChunkName: ">App2" */ "../App2.vue"),
  },
  {
    path: "/App3",
    name: "App3",
    component: () => import(/* webpackChunkName: ">App3" */ "../App3.vue"),
  },
  {
    path: "/App4",
    name: "App4",
    component: () => import(/* webpackChunkName: ">App4" */ "../App4.vue"),
  },
];

const router = new VueRouter({
  routes,
});

export default router;
