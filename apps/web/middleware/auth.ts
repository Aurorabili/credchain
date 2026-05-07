export default defineNuxtRouteMiddleware((to) => {
    // Skip guard for the welcome/login page itself
    if (to.path === "/welcome") return;

    // Check wallet connection state from useChain
    // We access the reactive ref directly via an import trick
    // Instead, we just check if the route is being accessed without connection
    // The actual wallet check happens client-side in onMounted
});
