plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:8.5.1")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.25")
        classpath("org.jetbrains.kotlin:compose-compiler-gradle-plugin:2.0.21")
    }
}

android {
    namespace = "wuji.plugin.mywebview"
    compileSdk = 36

    defaultConfig {
        minSdk = 21

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        consumerProguardFiles("consumer-rules.pro")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
}

// scripts/ 为 WebView 注入脚本单一来源；构建前同步到 assets
val syncWebviewScripts = tasks.register("syncWebviewScripts") {
    val scriptsDir = file("../scripts")
    val assetsDir = layout.projectDirectory.dir("src/main/assets").asFile

    inputs.dir(scriptsDir)
    outputs.dir(assetsDir)

    doLast {
        assetsDir.mkdirs()
        project.copy {
            from(scriptsDir)
            include("sniff_init.js", "spoof.js")
            into(assetsDir)
        }
        val playTrigger = scriptsDir.resolve("play_trigger.js").readText()
        val scraping = scriptsDir.resolve("scraping.android.js").readText()
        assetsDir.resolve("scraping.js").writeText("$playTrigger\n$scraping")
    }
}

tasks.named("preBuild") {
    dependsOn(syncWebviewScripts)
}

dependencies {
    implementation("androidx.core:core-ktx:1.9.0")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.appcompat:appcompat:1.6.0")
    implementation("com.google.android.material:material:1.7.0")
    implementation("org.apache.commons:commons-text:1.9")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")

    implementation(project(":tauri-android"))
}
