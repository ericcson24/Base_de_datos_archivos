import os
import ctypes
import shutil

def es_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def main():
    if not es_admin():
        print("❌ Este programa necesita privilegios de administrador.")
        input("Pulsa ENTER para salir...")
        return

    print("🧑 Crear usuario RDP + Nube Personal")
    usuario = input("Nombre del nuevo usuario: ").strip()
    clave = input("Contraseña (mínimo 8 caracteres, mayúsculas, números): ").strip()

    print("🔧 Creando usuario de Windows...")
    os.system(f'net user {usuario} {clave} /add')
    os.system(f'net localgroup "Usuarios de escritorio remoto" {usuario} /add')

    # Crear carpeta de datos
    carpeta = f'C:\\NubeDistribuible_v2\\Datos\\{usuario}'
    os.makedirs(carpeta, exist_ok=True)

    print("📝 Creando login.txt...")
    try:
        with open(os.path.join(carpeta, "login.txt"), "w") as f:
            f.write(clave)
    except Exception as e:
        print(f"❌ Error creando login.txt: {e}")

    print("📋 Añadiendo usuario a usuarios.txt...")
    try:
        ruta_usuarios = 'C:\\NubeDistribuible_v2\\Datos\\usuarios.txt'
        os.makedirs(os.path.dirname(ruta_usuarios), exist_ok=True)
        with open(ruta_usuarios, "a") as f:
            f.write(f"{usuario}:{clave}\n")
    except Exception as e:
        print(f"❌ Error escribiendo en usuarios.txt: {e}")

    print("📂 Copiando scripts al escritorio por defecto (Default User)...")
    escritorio_def = "C:\\Users\\Default\\Desktop"
    os.makedirs(escritorio_def, exist_ok=True)

    local_path = os.getcwd()
    try:
        shutil.copy(os.path.join(local_path, "vincular_carpeta_desde_escritorio.bat"), escritorio_def)
        shutil.copy(os.path.join(local_path, "redirigir_carpetas_usuario.ps1"), escritorio_def)
    except Exception as e:
        print(f"❌ Error copiando scripts al escritorio por defecto: {e}")

    print("✅ Usuario creado con éxito y listo para la nube.")
    input("Pulsa ENTER para finalizar.")

if __name__ == "__main__":
    main()