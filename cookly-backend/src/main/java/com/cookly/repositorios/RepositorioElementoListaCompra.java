package com.cookly.repositorios;

import com.cookly.modelos.ElementoListaCompra;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RepositorioElementoListaCompra extends JpaRepository<ElementoListaCompra, Long> {

    /** Borra todos los elementos de una lista (así la lista se puede eliminar sin depender del ON DELETE CASCADE de la base). */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from ElementoListaCompra e where e.lista.id = :listaId")
    void borrarDeLista(@Param("listaId") Long listaId);

    /** Borra solo los elementos ya comprados de una lista. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from ElementoListaCompra e where e.lista.id = :listaId and e.comprado = true")
    void borrarCompradosDeLista(@Param("listaId") Long listaId);
}