import org.gradle.api.tasks.Copy

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "qa.dohatv.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "qa.dohatv.app"
        minSdk = 23
        targetSdk = 28
        versionCode = 3
        versionName = "1.2"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}

val syncWebAssets by tasks.registering(Copy::class) {
    from(rootProject.projectDir) {
        include("index.html", "styles.css", "app.js", "manifest.webmanifest", "favicon.svg", "sw.js", "doha-skyline.svg")
    }
    into(layout.projectDirectory.dir("src/main/assets"))
}

tasks.named("preBuild").configure { dependsOn(syncWebAssets) }
