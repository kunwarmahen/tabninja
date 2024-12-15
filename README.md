If you're anything like me, you often find yourself with countless browser tabs open—each representing an interesting article, news story, or reference for later. While our curiosity and intent are commendable, managing 10s or even 100s of tabs can quickly become overwhelming.

To solve this, I propose a solution: extract and organize content into a vector database, whether locally or remotely. This approach allows you to search and rediscover relevant information effortlessly, exactly when you need it. No more endless scrolling or hunting through tabs—just efficient and intelligent access to your saved insights.

The project has two folders

1. Chrome Extension
   * To extract content from all open tabs and push to local or remote vector database
   * Search through the content and summarization using LLM
2.  Backend NodeJS application which can handle all the Embedding logic and query logic in case you to use backend system to handle all the hardwork

Project assumes you have Ollama with all the models you need

To install Ollama follow

[https://ollama.com/download/](https://ollama.com/download)

And pull atleast one embedding and one LLM model

I use nomic for embedding

ollama pull nomic-embed-text 

And llama3.2 for testing

ollama pull llama3.2

And then enable ollama to handle cross site, add Environment="OLLAMA_ORIGINS=*" to service (need to find equivalent for Windows and MAC)

![Ollama CORS](https://github.com/user-attachments/assets/002cbf5a-d4d8-4caf-aee4-d7f285d4ad5f)



Once you have models loaded are all set to use the extension in local vector database mode

Fist install Chrome Extension by Clicking Extension from menu and then 

Enable Developer Mode

![Enable Developer Mode](https://github.com/user-attachments/assets/527cda7a-fc44-4ce6-9e31-45f6f2630f00)

![Load Unpacked](https://github.com/user-attachments/assets/cd7f5e0d-38a3-4e0e-b3c4-a71ce87cb0d8)

Select the extension folder e.g.

![Extention Folder](https://github.com/user-attachments/assets/fd0711fb-177f-43a7-b476-b10686baeddb)


You should see an extension loaded, make sure to enable it

![Extension loaded](https://github.com/user-attachments/assets/313cbb12-803b-45fc-968e-4d31619696cd)

You are all set to use it by clicking icon like

![See all extension](https://github.com/user-attachments/assets/572f62e6-a1d0-47ca-8ff9-ab5d6d489b26)


![Click Extension](https://github.com/user-attachments/assets/0fc34eb4-73d1-4f11-bb2a-02af56bebd89)

And also Pin

![Pin Extension](https://github.com/user-attachments/assets/3830f89b-1841-43a7-9504-55a1449b9126)


First click settings to configure you extension

![First click settings](https://github.com/user-attachments/assets/3b7fd6ce-705e-43cf-a100-c8e2651d536b)


For local 

![Set values based on what you selected for embedding and LLM](https://github.com/user-attachments/assets/e1937dd2-e560-4b16-8a61-4e27cab29119)


For remote

![Set service path for remote service](https://github.com/user-attachments/assets/17e354bc-f0ca-46bb-8c81-b3727a0b3e03)

Make sure to save in both condition

You are all set to ask tabs (limitation: close the extension after setting values by clicking anywhere and open it again and now it knows what to do and may be you need to do it open once more if it says it cannot find)

![Ask question e.g. Remote](https://github.com/user-attachments/assets/fd5ee5d5-26bc-46fa-af6a-7cdc1f403dc9)

![Ask question e.g. Local](https://github.com/user-attachments/assets/10422735-2c4a-4d0e-88a0-fcd6699a7031)


If you decide to use local than you will need to configure you local service

Run you local service code in side tabninjabackend
 
I assume you have installed nodejs https://nodejs.org/en/download/package-manager

Make sure to run chromadb somehwere

Update

config.js with values which is relevent for you

For first time run (on linux)

npm install 

and then 

node app.js

or nodemon app.js for dev mode.


Update you settings in your chrome extension to use remote vector database by unchecking Use Local Vecctor Database and setting the value for Remote Service URL

And start using it.


Future enhancement

1. Handle race condition for local vector database during the first run
2. After changes in setting load pages again automatically
3. Add logic to remove URLS from which it should not read
4. Do a better job of extracting content from webpage
5. Add logic to connect to OpenAI or Claude or Gemini
6. Convert extension into sidepanel




Local Vector Solution creates Embedding stores emm
   
