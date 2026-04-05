# BSCS ARCHIVE

local web system designed to archive and manage class photos. basically a time capsule but on a website 

## features

* responsive photo gallery with a detailed modal view.
* admin dashboard to approve, edit, or delete entries.
* local storage system to keep images and data private.

## tech stack in this project we've used

* frontend: vanilla html, css, javascript
* backend: node.js, express
* database: sqlite3

<!-- ## UI previews -->
<!---->
<!-- |          gallery view           |         detail view          |       admin dashboard       | -->
<!-- | :-----------------------------: | :--------------------------: | :-------------------------: | -->
<!-- | ![gallery](path/to/gallery.jpg) | ![detail](path/to/modal.jpg) | ![admin](path/to/admin.jpg) | -->

---

## local setup

> [!IMPORTANT]
> this project doesn't use any remote servers or cloud databases and everything is designed to run locally using SQLite3 if you want to try and test this project you'll need to build, run, and host the local server from your own device  


## for linux/macOS/windows

- clone the repository
```
git clone https://github.com/frtzhahn/BSCS-archive-project.git)
cd BSCS-archive-project
````

- **install dependencies**

```
npm install
```

- **configure the environment**
	copy `.env.example` and rename it to `.env`. you can update the default admin credentials inside this file.
- **start the server**

```
node server.js
```

>[!NOTE]
>open your browser and go to `http://localhost:3000`. a fresh local database will be created automatically on your first boot. 
>if the project run successfully but some features won't work restart the server

---

## for termux users (mobile)

- **update termux packages**

```
pkg update && pkg upgrade -y
```

- **install node.js, git, and required c++ compilers**

```
pkg install nodejs git clang make python sqlite -y
```

- **patch the python compiler tools**
(node-gyp requires this to compile the database without crashing)

```
pip install setuptools
```

- **clone the repository and open the project directory**

```
git clone https://github.com/frtzhahn/BSCS-archive-project.git
cd BSCS-archive-project
```
- **install node dependencies with the ndk bypass**
(this flag stops the compiler from looking for pc-specific android tools)

```
npm install --android_ndk_path=""
```
- **setup the local environment variables**

```
cp .env.example .env
```
- **start the local server**

```
node server.js
```

>[!NOTE]
>to view the website open chrome or any mobile browser and go to `http://localhost:3000`
>if the project run successfully but some features won't work restart the server

>[!IMPORTANT]
>to access admin pages/privilleges the default username and password are both `admin`
>to customize admin credentials you can create a .env file on the project root folder and update these fields based on you preferences
>`ADMIN_USERNAME=prefered_admin_username`
>`ADMIN_PASSWORD=prefered_admin_password`
>restart the server after the admin credentials update
