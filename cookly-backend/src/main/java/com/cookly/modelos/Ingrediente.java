package com.cookly.modelos;
import jakarta.persistence.*;
@Entity @Table(name="ingredientes") public class Ingrediente { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id; @Column(nullable=false,unique=true) private String nombre; public Long getId(){return id;} public String getNombre(){return nombre;} public void setNombre(String v){nombre=v;} }
