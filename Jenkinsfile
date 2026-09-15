pipeline {
  agent any

  options {
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  parameters {
    booleanParam(name: 'PUSH_IMAGE', defaultValue: false, description: 'Push the verified image to the configured registry.')
    string(name: 'IMAGE_REPOSITORY', defaultValue: 'ghcr.io/your-org/zyphor', description: 'Repository without a tag.')
    string(name: 'REGISTRY', defaultValue: 'ghcr.io', description: 'Container registry hostname.')
    string(name: 'REGISTRY_CREDENTIALS_ID', defaultValue: 'container-registry', description: 'Jenkins username/password credential ID; used only when PUSH_IMAGE is enabled.')
  }

  environment {
    NEXT_TELEMETRY_DISABLED = '1'
    CI = 'true'
  }

  stages {
    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Validate') {
      steps {
        sh 'npx prisma generate'
        sh 'npx tsc --noEmit'
      }
    }

    stage('Build application') {
      steps {
        sh 'npm run build'
      }
    }

    stage('Build image') {
      when { expression { return params.PUSH_IMAGE || env.BRANCH_NAME == 'main' } }
      steps {
        script {
          env.GIT_SHORT_SHA = sh(script: 'git rev-parse --short=7 HEAD', returnStdout: true).trim()
          env.IMAGE_TAG = "${params.IMAGE_REPOSITORY}:${env.BUILD_NUMBER}-${env.GIT_SHORT_SHA}"
        }
        sh 'docker build --pull --label org.opencontainers.image.revision=$GIT_SHORT_SHA --tag $IMAGE_TAG .'
      }
    }

    stage('Push image') {
      when { expression { return params.PUSH_IMAGE } }
      steps {
        withCredentials([usernamePassword(credentialsId: params.REGISTRY_CREDENTIALS_ID, usernameVariable: 'REGISTRY_USERNAME', passwordVariable: 'REGISTRY_PASSWORD')]) {
          sh '''
            printf '%s' "$REGISTRY_PASSWORD" | docker login "$REGISTRY" --username "$REGISTRY_USERNAME" --password-stdin
            docker push "$IMAGE_TAG"
            docker logout "$REGISTRY"
          '''
        }
      }
    }
  }

  post {
    always {
      deleteDir()
    }
  }
}
