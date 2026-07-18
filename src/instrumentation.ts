export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { installServerErrorEmailReporter } = await import("./lib/error-reporting");
    installServerErrorEmailReporter();
  }
}