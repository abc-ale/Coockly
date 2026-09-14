package com.cookly.repositorios;
import com.cookly.modelos.Usuario; import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
public interface RepositorioUsuario extends JpaRepository<Usuario,Long>{ Optional<Usuario> findByCorreo(String correo); boolean existsByCorreo(String correo); }
