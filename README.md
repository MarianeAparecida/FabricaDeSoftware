# Agendamento SUS Online

[Documento com as especificações do projeto](https://docs.google.com/document/d/17JzTCo7LYkEA5B1WowKCUH6qqCqh-t1_/edit#heading=h.knpinbvkozm4)

[Acesso das HU com os protótipos](https://docs.google.com/spreadsheets/d/1jKtuyUHv7XniL5sgp3FePg4-SvljHVftocVHPyPiOnQ/edit?gid=891834841#gid=891834841)

Protótipos Mobile: [(Acesso no Figma)](https://www.figma.com/design/0THctJLxAMypddq06xTW1v/SUSAGENDAMENTO?node-id=0-1&p=f&t=BVUlqQPTzNu1cjh9-0)
<br>
<img width="20%" height="667" alt="Login" src="https://github.com/user-attachments/assets/023cba3b-eb49-4041-9ea3-accb56c438ec" />
<img width="20%" height="667" alt="Tela Principal" src="https://github.com/user-attachments/assets/11b27c9a-67f6-4a9a-9c74-aea5ffd97938" />
<img width="20%" height="667" alt="AbaAgendamento" src="https://github.com/user-attachments/assets/6ef04067-4ae0-4f37-a628-7aa308f6e84e" />
<img width="20%" height="667" alt="AbaConfimaçao" src="https://github.com/user-attachments/assets/e1d7b6bb-6c0c-452c-831e-97801811bc4c" />
<img width="20%" height="667" alt="AbaMeuHistorico" src="https://github.com/user-attachments/assets/8ec3240c-184a-43e6-8812-d86b189f8225" />
<img width="20%" height="667" alt="AbaMinhasConsultas" src="https://github.com/user-attachments/assets/c9789a35-a79e-4e11-9386-5c06a6480c1c" />
<img width="20%" height="667" alt="AbaUnidadedeSaude" src="https://github.com/user-attachments/assets/02a011da-5f97-41bd-99f3-1dd98bccc677" />
<img width="20%" height="667" alt="AbaMedicamento" src="https://github.com/user-attachments/assets/28dda518-b1f3-4510-869e-8f76699532a0" />

# Pré-requisitos
-Android Studio<br>
-Android SDK<br>
-Java JDK 21<br>
-Um emulador configurado para android<br>
-Visual Studio Code<br>
-Extensão "Expo Tools" para VSCode<br>
-Expo Orbit<br>

# Backend (Supabase local)
O banco, a autenticação e as Edge Functions ficam na pasta `supabase/` e rodam localmente via Docker.<br>
**Pré-requisito:** Docker Desktop aberto.<br>
Execute o comando 'npm install'<br>
Execute o comando 'npm run db:start'. Na primeira vez ele baixa as imagens Docker (alguns GB) e cria o banco com dados de exemplo<br>
Copie o arquivo '.env.example' para '.env.local' e preencha 'EXPO_PUBLIC_SUPABASE_ANON_KEY' com o 'ANON_KEY' exibido por 'npm run db:status'<br>
No emulador Android, use 'EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:54321'; no celular físico, use o IP do seu PC na rede<br>

**Usuário de teste** (já verificado): CPF `123.456.789-00`, senha `ABC123!@#ab`. O botão "Entrar com o gov.br" da tela de login preenche esses dados.<br>
**E-mails** (recuperação de senha) não saem para a internet: abra http://127.0.0.1:54324 para vê-los.<br>
**Recriar o banco do zero** (aplica `supabase/migrations` e `supabase/seed.sql` de novo): 'npm run db:reset'<br>
**Testar o banco** (políticas de acesso e fuso horário): 'npm run db:test'. Veja [docs/politicas-de-acesso.md](docs/politicas-de-acesso.md) e [docs/data-e-hora.md](docs/data-e-hora.md)<br>
**Desligar:** 'npm run db:stop'<br>

# Realizando a build do projeto localmente e rodando (android/web)
**Realize a build pelo menos uma vez, e sempre realize quando alterar bibliotecas** <br>
[Defina a variável de ambiente](https://supertutoriais.com.br/pc/como-criar-variaveis-personalizadas-windows-10/) 'ANDROID_HOME' e reinicie o PC. Normalmente ela se encontra em 'C:\Users\user\AppData\Local\Android\Sdk' ou em um local similar.<br>
Clone o repositório na branch 'main'<br>
Abra a pasta raíz com o Visual Studio Code<br>
Abra o terminal e confirme que ele está na rota terminando em '\FabricaDeSoftware'<br>
Garanta que o emulador consegue abrir com sucesso<br>
Execute o comando 'npm install'<br>
Execute o comando 'npx expo prebuild'<br>
Execute o comando 'npx expo run:android'. Execute novamente se o erro 'adb.exe: device offline' surgir<br>
Aguarde o build local terminar. Pode demorar mais de 20 minutos<br>
Aperte 'a' para abrir no emulador android ou 'w' par abrir na web<br>

# Rodando sem realizar build
**Você pode rodar sem build após mudanças não relacionadas ao app.json ou a bibliotecas** <br>
Execute o comando 'npx expo start'<br>
Aperte 'a' para abrir no emulador android ou 'w' par abrir na web<br>

# Rodando uma build específica (android/web)
Acesse o a build específica (pelo dashboard do expo.dev ou por um link)<br>
Clique em "Open with Orbit" ou "Abrir com Orbit"<br>